import {Fs, Theme} from 'theme-manager';
import {PackageJson} from './theme';
import upath from 'upath';

/**
 * CSSから参照されているファイルのリストアップ
 * @param text
 * @returns
 */
 export const pickupCSSResources = (text: string): string[] => {
  // TODO: パースして取り出す エラー処理も重要
  // const ast = parse(text);

  const imagePaths = Array.from(
    text.matchAll(/url\("?(.+?)"?\)/g),
    (m) => m[1],
  );
  // console.log('imagePaths', imagePaths);
  return imagePaths;
};

/**
 * nodeパッケージ型のテーマ
 * package.jsonがルートディレクトリに存在する
 */
export class PackageTheme implements Theme {
  name: string = '';
  author: string = '';
  date: string = '';
  description: string = '';
  keywords: string[] = [];
  maintainers: {username: string; email: string}[] = [];
  publisher: {username: string; email: string} = {username: '', email: ''};
  scope: string = '';
  version: string = '';
  // from package.json
  category: string = '';
  style: string = '';
  topics: string[] = [];
  files: {[filepath: string]: any} = {};
  fs: Fs;

  public static async create(fs: Fs, packageName: string): Promise<Theme> {
    const pkgJson = (await PackageTheme.getPackageJson(
      fs,
    )) as unknown as PackageJson;
    console.log(pkgJson);
    const theme = new PackageTheme(fs, pkgJson);
    return theme;
  }

  /**
   * テーマのもろもろを処理して指定の場所(FS)に書き出す
   * @param dstFs 
   * @returns 書き出した主となるCSSの相対パス(dstFsのルートディレクトリ基準)
   */
  public async process(dstFs:Fs): Promise<string> {
    console.log('processingThemeString',this);
    if( !this.style ) { console.log('empty theme'); return ''; }
    const themePath = `${this.name}/${this.style}`;
    const stylesheet = await this.fs.readFile(this.style) as string;
    // console.log('stylesheet',stylesheet);
    if(!stylesheet) {
      return '';
    }
  
    await dstFs!.writeFile(themePath, stylesheet);
    console.log(`updateCache : ${themePath}`);
    
    const imagesOfStyle = pickupCSSResources(stylesheet);
    // console.log('imagesOfStyle',imagesOfStyle);
    await Promise.all(
      imagesOfStyle.map(async(imageOfStyle) => {
        const contentPath = upath.join(upath.dirname(this.style),imageOfStyle);
        // console.log('contentPath',contentPath);
        const content = await this.fs.readFile(contentPath);
        dstFs.writeFile(contentPath, content);
      }),
    ).catch((error) => {
      console.log(error);
      throw error;
    });
  
    return dstFs?.root+'/'+themePath;
  }

  public constructor(fs: Fs, pkgJson: PackageJson) {
    this.fs = fs;
    this.name = pkgJson.name;
    this.description = pkgJson.description;
    this.version = pkgJson.version;
    this.author = pkgJson.author;
    if (pkgJson.vivliostyle) {
      if (pkgJson.vivliostyle.theme) {
        const t = pkgJson.vivliostyle.theme;
        this.category = t.category ?? '';
        this.topics = t.topics ?? [];
        this.style = upath.normalize(t.style ?? '');
      }
    }
  }

  public getStylePath(): string | null {
    return `${this.name}/${this.style}`;
  }

  /**
   * テーマに含まれるファイルを取得する
   */
  public async fetch() {
    // if (this.style) {
    //   try {
    //     const data = await io.get(
    //       upath.join(repository.directory, this.style)
    //     );
    //     this.files[this.style] = data;
    //   } catch (error) {
    //     throw new Error("style file access error");
    //   }
    // }
  }

  public static async fetch(packageName: string): Promise<Theme | null> {
    // //TODO: とりあえずGitHubに本体のあるパッケージの場合.他のケースはあとで
    // const pkgName = encodeURIComponent(packageName);
    // const results = await NpmApi.getPackage(pkgName);
    // const repository = results.collected.metadata.repository;
    // if (!repository) {
    //   throw new Error("GitHub repository not found : " + pkgName);
    // }
    // // GitHubにアクセスするためのIOクラス
    // const path = GitHubIO.parseURL(repository.url);
    // const io = new GitHubIO(path.owner, path.repo, GitHubAccessToken);

    // const filenames = await io.findAll();
    // const pkgJson = (await PackageTheme.getPackageJson(
    //   repository.directory,
    //   io
    // )) as unknown as {
    //   name: string;
    //   description: string;
    //   version: string;
    //   author: string;
    //   vivliostyle: {
    //     theme: {
    //       category?: string;
    //       topics?: string[];
    //       style?: string;
    //     };
    //   };
    // };
    // const theme = new PackageTheme();
    // // console.log(pkgJson);
    // theme.name = packageName;
    // theme.description = pkgJson.description;
    // theme.version = pkgJson.version;
    // theme.author = pkgJson.author;
    // if (pkgJson.vivliostyle) {
    //   if (pkgJson.vivliostyle.theme) {
    //     const t = pkgJson.vivliostyle.theme;
    //     theme.category = t.category ?? "";
    //     theme.topics = t.topics ?? [];
    //     theme.style = upath.normalize(t.style ?? "");
    //   }
    // }
    // if (theme.style) {
    //   try {
    //     const data = await io.get(
    //       upath.join(repository.directory, theme.style)
    //     );
    //     theme.files[theme.style] = data;
    //   } catch (error) {
    //     throw new Error("style file access error");
    //   }
    // }
    // return theme;
    return null;
  }

  /**
   * npm-api.jsの結果からPackageThemeオブジェクトを生成
   * @param packageName
   * @returns PackageThemeオブジェクトまたはundefined
   */
  public static async fromNpm(packageName: string): Promise<Theme | null> {
    // try {
    //   const packageTheme = await PackageTheme.fetch(packageName);

    //   return packageTheme;
    // } catch (e) {
    //   if ((e as Error).message.includes("API rate limit")) {
    //     throw new Error("認証せずにGitHub APIを使えるのは、60件/時まで");
    //   } else {
    //     throw e;
    //   }
    // }
    return null;
  }

  private static async getPackageJson(fs: Fs): Promise<string | object> {
    const path = `package.json`;
    const pkg_json = await fs.readFile(path, true);
    return pkg_json;
  }
}
