import NpmApi from "npm-api.js"; // npm-apiとnpm-api.jsという別のパッケージがあるので注意
import { PluginManager } from "../node_modules/live-plugin-manager/dist/index";
import { GitHubIO, ThemeIO } from "./srcIO";
import upath from "upath";

let GitHubAccessToken: string | null;

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

export interface Theme {
  name: string;
  category: string;
  topics: string[];
  style: string;
  description?: string;
  version?: string;
  author?: string;
  files: { [filepath: string]: any };
}

/**
 * CSSファイル単体のテーマ
 * http
 * local
 * TODO: nodeパッケージはありえないか
 */
export class SingleFileTheme implements Theme {
  name: string = "";
  category: string;
  style: string;
  topics: string[] = [];
  description?: string | undefined;
  version?: string | undefined;
  author?: string | undefined;
  files: { [filepath: string]: any } = {};

  constructor(packageName: string) {
    // HTTPかローカルか
    if (packageName.match(/^https?:/)) {
      // HTTP
      // this.srcIO = new HttpIO();
    } else {
      // ローカル
      // this.srcIO = new localIO();
    }
    this.name = packageName;
    this.style = packageName;
    // TODO: コメントから取得
    this.category = "";
  }
}

/**
 * nodeパッケージ型のテーマ
 * package.jsonがルートディレクトリに存在する
 */
export class PackageTheme implements Theme {
  name: string = "";
  author: string = "";
  date: string = "";
  description: string = "";
  keywords: string[] = [];
  links: {
    npm?: string;
    homepage?: string;
    repository?: string;
    bugs?: string;
  } = {};
  maintainers: { username: string; email: string }[] = [];
  publisher: { username: string; email: string } = { username: "", email: "" };
  scope: string = "";
  version: string = "";
  // from package.json
  category: string = "";
  style: string = "";
  topics: string[] = [];
  files: { [filepath: string]: any } = {};

  public constructor() {}

  public static async fetch(packageName: string): Promise<Theme> {
    //TODO: とりあえずGitHubに本体のあるパッケージの場合.他のケースはあとで
    const pkgName = encodeURIComponent(packageName);
    const results = await NpmApi.getPackage(pkgName);
    const repository = results.collected.metadata.repository;
    if (!repository) {
      throw new Error("GitHub repository not found : " + pkgName);
    }
    // GitHubにアクセスするためのIOクラス
    const path = GitHubIO.parseURL(repository.url);
    const io = new GitHubIO(path.owner, path.repo, GitHubAccessToken);

    const filenames = await io.findAll();
    const pkgJson = (await PackageTheme.getPackageJson(
      repository.directory,
      io
    )) as unknown as {
      name: string;
      description: string;
      version: string;
      author: string;
      vivliostyle: {
        theme: {
          category?: string;
          topics?: string[];
          style?: string;
        };
      };
    };
    const theme = new PackageTheme();
    // console.log(pkgJson);
    theme.name = packageName;
    theme.description = pkgJson.description;
    theme.version = pkgJson.version;
    theme.author = pkgJson.author;
    if (pkgJson.vivliostyle) {
      if (pkgJson.vivliostyle.theme) {
        const t = pkgJson.vivliostyle.theme;
        theme.category = t.category ?? "";
        theme.topics = t.topics ?? [];
        theme.style = upath.normalize(t.style ?? "");
      }
    }
    if (theme.style) {
      try {
        const data = await io.get(
          upath.join(repository.directory, theme.style)
        );
        theme.files[theme.style] = data;
      } catch (error) {
        throw new Error("style file access error");
      }
    }
    return theme;
  }

  /**
   * npm-api.jsの結果からPackageThemeオブジェクトを生成
   * @param packageName
   * @returns PackageThemeオブジェクトまたはundefined
   */
  public static async fromNpm(packageName: string): Promise<Theme> {
    try {
      const packageTheme = await PackageTheme.fetch(packageName);

      return packageTheme;
    } catch (e) {
      if ((e as Error).message.includes("API rate limit")) {
        throw new Error("認証せずにGitHub APIを使えるのは、60件/時まで");
      } else {
        throw e;
      }
    }
  }

  public static async getPackageJson(
    repo_directory: string,
    io: ThemeIO
  ): Promise<object | null> {
    const path = `${repo_directory ?? ""}/package.json`;
    try {
      const pkg_json = await io.get(path, true);
      return pkg_json;
    } catch (error) {
      console.error(error, "file read error:", path);
      return null;
    }
  }
}

/**
 *
 */
export default class ThemeManager {
  themes: Theme[] = [];
  serchQuery: string = "keywords:vivliostyle-theme";

  /**
   * コンストラクタ
   * @param token GitHubAccessToken
   */
  public constructor(token: string | null = null) {
    GitHubAccessToken = token;
  }

  /**
   * NPMで公開されているテーマの一覧を取得
   * @param query
   * @param max 最大取得件数
   * @returns
   */
  public async searchFromNpm(query: string = this.serchQuery, max = 100) {
    try {
      const results = await NpmApi.SearchPackage(query, max);
      // console.log(results);
      if (!results) {
        return [] as Theme[];
      }
      const promises: Promise<PackageTheme | null>[] = results.map(
        async (result: any) => {
          try {
            const theme = await PackageTheme.fromNpm(result.package.name);
            return theme;
          } catch (error) {
            return null;
          }
        }
      );
      const themes = (await Promise.all(promises)).filter((v) => v) as Theme[]; // nullを除去
      this.themes = themes;

      return this.themes;
    } catch (error) {
      console.error(error);
      return [] as Theme[];
    }
  }

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
