import upath from "upath";
import { Fs } from "./srcIO";

export interface Theme {
  name: string;
  category: string;
  topics: string[];
  style: string;
  description?: string;
  version?: string;
  author?: string;
  files: { [filepath: string]: any };
  fs: Fs;
  getStylePath: ()=>string|null;
}

export type PackageJson = {
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
  fs:Fs;

  public constructor(fs:Fs, packageName:string) {
    this.fs = fs;
    this.name = packageName;
    const repo_dir = '';
    const pkgJson = this.getPackageJson(repo_dir) as unknown as PackageJson;
    // console.log(pkgJson);
    this.name = packageName;
    this.description = pkgJson.description;
    this.version = pkgJson.version;
    this.author = pkgJson.author;
    if (pkgJson.vivliostyle) {
      if (pkgJson.vivliostyle.theme) {
        const t = pkgJson.vivliostyle.theme;
        this.category = t.category ?? "";
        this.topics = t.topics ?? [];
        this.style = upath.normalize(t.style ?? "");
      }
    }
  }

  public getStylePath():string|null{
    return null;
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

  public static async fetch(packageName: string): Promise<Theme|null> {
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
  public static async fromNpm(packageName: string): Promise<Theme|null> {
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

  private async getPackageJson(
    repo_directory?: string
  ): Promise<string | object> {
    const path = `${repo_directory ?? ""}/package.json`;
    const pkg_json = await this.fs.readFile(path, true);
    return pkg_json;
  }
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
  fs:Fs;

  constructor(fs:Fs,packageName: string) {
    this.fs = fs;
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

  public getStylePath():string|null{
    return null;
  }
}