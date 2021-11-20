import fetchGhContent from "fetch-github-content";

export interface ThemeIO {
  get(path: string,json?:boolean): any;
  put(path: string, data: any): void;
  // TODO: parentTheme 等の項目を設ける?
}

/**
 * テーマの本体がGitHubにある
 */
export class GitHubIO implements ThemeIO {
  private token: string | null;
  private owner: string;
  private repo: string;

  /**
   * コンストラクタ
   * @param token GitHubAccessToken
   */
  public constructor(owner:string,repo:string,token: string | null = null) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
  }

  /**
   *
   * @param path
   * @param data
   */
  public put(path: string, data: any): void {
    throw new Error("Method not implemented.");
  }

  /**
   * TODO: 全ファイル名の取得
   */
  public async findAll(): Promise<string[]> {
    return [];
  }

  public static parseURL(url:string):{ owner: string; repo: string; path: string }{
    const found = url.match(
      /https:\/\/github\.com\/([\w-\.]+)\/([\w-\.]+).git(?:\/(.*))?/
    );
    if (found == null || !found[1] || !found[2] ) {
      throw new Error("invalid github url : " + url);
    }
    const path = { owner: found[1], repo: found[2], path: found[3] };
    return path;
  }

  /**
   * ファイルを取得
   * @param path 取得するファイルのパス(owner/repo/以下)
   * @param json JSONオブジェクトとして取得するならtrue
   * @returns
   */
  public async get(
    path: string,
    json: boolean = false
  ): Promise<any> {
    const content = await fetchGhContent({
      owner: this.owner,
      repo: this.repo,
      path,
      token: this.token,
      json,
    });
    return content;
  }
}

export class AppCacheIO implements ThemeIO {
  get(path: string) {
    throw new Error("Method not implemented.");
  }
  put(path: string, data: any): void {
    throw new Error("Method not implemented.");
  }
}

/**
 * ローカルファイルの入出力
 */
export class LocalIO implements ThemeIO {
  get(path: string) {
    throw new Error("Method not implemented.");
  }
  put(path: string, data: any): void {
    throw new Error("Method not implemented.");
  }
}
