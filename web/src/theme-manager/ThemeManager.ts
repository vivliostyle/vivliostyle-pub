import NpmApi from "npm-api.js"; // npm-apiとnpm-api.jsという別のパッケージがあるので注意
import { Fs } from "./Fs";
import { PackageTheme, Theme } from ".";

// テーマの検索
// DONE: keywords:vivliostyle-themeで一覧取得
// REJECT: vivliostyle.config.jsを元にテーマを取得
// TODO: 公式のテーマのみ一覧取得するモード
//       ThemeManager.search(keyword:string="",officialOnly:boolean=true);
// DONE: テーマの属性による検索
// REJECT: npm-apiのほうがファイル取得などに向いているかも
// REJECT: ローカルに存在するテーマのリストアップ
// TODO: バージョン指定してダウンロード
// REJECT: npm以外のテーマ(GitHubなどURL指定)の取得

// # テーマの取得
// REJECT: PUB,CLI,create-bookでも使えるように
// TODO: パッケージを任意の場所へダウンロード
// REJECT: node用、ブラウザ用 作り分ける?
//       https://qiita.com/riversun/items/1da0c0668d0dccdc0460
//       https://nekonecode.hatenablog.com/entry/2020/09/29/094913
//       環境依存の処理は使う側に任せる
// TODO: PubでApplication Cacheに書き込めるようにCSSや画像をオンメモリで取得できるようにしたい。
// TODO: 単体CSSでもコメントにメタ情報があれば読み取る(WordPressっぽく)
// TODO: SCSSのコンパイル
// TODO: privateなリポジトリに対応

// # 更新チェック/アップデート
// TODO: ローカルにダウンロードしたテーマの更新チェック
// TODO: パッケージをローカルにコピーした時にコミットハッシュ値等をpackage.json に追記
//       アップデートチェックや差分処理に使用
//       https://docs.github.com/en/rest/reference/repos#compare-two-commits
// TODO: 子テーマとマージ(ファイルの入れ替え)
// TODO: ロールバック

// MEMO: 名前はThemeManagerのほうが良いかなぁ
// MEMO: vivliostyle.config.js,package.jsonのハンドリングもライブラリ化できないか

// MEMO: テーマには形式(Package,CSSファイル)と保存場所(GitHub, NPM repository, ローカルファイル, ApplicationCache)の組合せが存在する

export type FsFactory = (themeLocation:any)=>Promise<Fs|false>;

export type ThemeManagerConfig = {
  searchOrder: FsFactory[];
}

/**
 *
 */
export default class ThemeManager {
  config: ThemeManagerConfig | null;
  themes: Theme[] = [];
  serchQuery: string = "keywords:vivliostyle-theme";

  /**
   * コンストラクタ
   * @param token GitHubAccessToken
   */
  public constructor(config: ThemeManagerConfig | null = null) {
    // if (config?.GitHubAccessToken) {
    //   GitHubAccessToken = config.GitHubAccessToken;
    // }
    this.config = config;
  }

  /**
   * npmのパッケージ名からGitHubへのアクセスオブジェクトを生成する
   * @param packageName 
   * @returns 
   */
  public async npmToFs(packageName:string):Promise<Fs|null> {
    // NPMのパッケージ情報からGitHubのURLを取得する
    const pkgName = encodeURIComponent(packageName);
    const result = await NpmApi.getPackage(pkgName);
    const repository = result.collected.metadata.repository; // {directory:string, type:"git", url:string }
    if (repository) {
      if (repository.type === "git") {
        return null; 
        // new GitHubFs({
        //   octkitOrToken:GitHubAccessToken!, 
        //   ownerOrUrl:repository.url
        // });    
      }
    } else {
      console.error('not Git : ', result.collected.metadata.name,'\n', result.collected.npm, '\n', result.collected.source);
    }
    throw new Error("GitHub repository not found : " + pkgName);
  }

  /**
   * npmで公開されているテーマの一覧を取得
   * @param query
   * @param max 最大取得件数
   * @returns
   */
  public async searchFromNpm(query: string = this.serchQuery, max = 100) {
    try {
      if( ! this.config?.searchOrder ) { throw new Error('no FsFactory'); }
      // npmのAPIを叩いて情報を取得する
      // {package:{name:string}}
      const results = await NpmApi.SearchPackage(query, max);
      const themes:Theme[] = [];
      for (const pkg of results) {
        // searchOrderリストの順に読み込みを試みる
        for(const factory of this.config.searchOrder) {
          // console.log('pkg',pkg);
          const fs = await factory(pkg);
          if(fs !== false) {
            // アクセス可能
            const theme = await PackageTheme.create(fs,pkg.package.name);
            themes.push(theme);
            break; // 処理できたら次のパッケージへ
          }
        }
      }
      // console.log(themes);
      return themes;
      // [
      //   {
      //     package: {
      //       name: '@vivliostyle/theme-bunko',
      //       scope: 'vivliostyle',
      //       version: '0.5.0',
      //       description: '文庫用のテーマ',
      //       keywords: [Array],
      //       date: '2021-11-07T11:47:24.147Z',
      //       links: [Object],
      //       author: [Object],
      //       publisher: [Object],
      //       maintainers: [Array]
      //     },
      //     flags: { unstable: true },
      //     score: { final: 0.5837110266096406, detail: [Object] },
      //     searchScore: 0.00008372865
      //   },
      // ]
      // console.log(results);
    } catch (error) {
      console.error(error);
      return [] as Theme[];
    }
  }

  /**
   * 
   * @param themeName 
   * @returns 
   */
  public async getPackageFromNpm(themeName: string): Promise<Theme> {
    // npmからパッケージ情報を取得する
    const results = await NpmApi.SearchPackage(themeName, 1);
    if (results.length != 1) {
      throw new Error("theme not found");
    }
    // GitHubからテーマ情報を取得する
    const theme = await PackageTheme.fromNpm(results[0].package.name);
    if (theme != null) {
      return theme;
    } else {
      throw new Error("theme not found");
    }
  }

  /**
   * テーマを取得する
   * @param themeName テーマ名 または URL
   * @returns themeインターフェースを実装するオブジェクト
   */
  public async getTheme(themeName: string): Promise<Theme | null> {
    // TODO: ローカル, npm, GitHubなどに条件分岐
    const theme = this.getPackageFromNpm(themeName);
    return theme;
  }
}
