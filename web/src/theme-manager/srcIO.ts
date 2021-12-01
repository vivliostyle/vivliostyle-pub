import fetchGhContent from 'fetch-github-content';
import { VFile } from './VFile';
/**
 * 読み書きインターフェース
 */
export type Fs = {
  /**
   * ファイルの内容を取得する
   */
  readFile: (path: string, json?: boolean) => Promise<string | Buffer>;
  /**
   * ファイルの内容を書き込む
   */
  writeFile: (
  // node.jsのfsではfileの型にinteger,dataの型にTypedArrayが含まれている
  file: string | Buffer | URL,
    data: string | Buffer | DataView | Object,
    options?: Object | string,
  ) => Promise<void>;
  /**
   * ファイルまたはディレクトリの一覧を取得
   */
  readdir: (path: string, options?: string | Object) => Promise<VFile[]>;
  /**
   * ファイルまたはディレクトリの削除
   */
  unlink: (path: string)=> Promise<boolean>;
};


/**
 * GitHubの特定のリポジトリを読み書きする
 */
export class GitHubFs implements Fs {
  owner: string;
  repo: string;
  dir: string;
  token: string;

  /**
   * urlからowner, repo, pathを取り出す
   * @param url
   * @returns
   */
  public static parseURL(url: string): {
    owner: string;
    repo: string;
    path: string;
  } {
    const found = url.match(
      /https:\/\/github\.com\/([\w-\.]+)\/([\w-\.]+).git(?:\/(.*))?/,
    );
    if (found == null || !found[1] || !found[2]) {
      throw new Error('invalid github url : ' + url);
    }
    const path = {owner: found[1], repo: found[2], path: found[3]};
    return path;
  }

  /**
   * コンストラクタ
   */
  public constructor(p: {
    octkitOrToken: string;
    ownerOrUrl?: string;
    repo?: string;
    dir?: string;
  }) {
    if (p.ownerOrUrl && p.repo) {
      // ownerやrepoが渡された
      this.owner = p.ownerOrUrl;
      this.repo = p.repo;
    } else {
      // URLが渡された場合
      const path = GitHubFs.parseURL(p.ownerOrUrl!);
      this.owner = path.owner;
      this.repo = path.repo;
    }
    this.dir = p.dir ?? '';
    this.token = p.octkitOrToken;
  }

  /**
   * 指定したディレクトリに存在するファイル、ディレクトリの配列を取得する
   * @param path 
   * @param options 
   * @returns 
   */
  public readdir = async (
    path: string,
    options?: string | Object,
  ): Promise<VFile[]> => { return []; };

  /**
   * 指定したファイルの内容を取得する
   * @param path 
   * @param json 
   * @returns 
   */
  public async readFile(
    path: string,
    json?: boolean,
  ): Promise<string | Buffer> {
    const content = await fetchGhContent({
      owner: this.owner,
      repo: this.repo,
      path,
      token: this.token,
      json,
    });

    return content;
  }

  /**
   * ファイルを書き込む
   */
  public async writeFile(): Promise<void> {
    throw new Error("GitHubFS::writeFile not implemented");
  }

  /**
   * ファイルを削除する
   * @returns 
   */
  public async unlink(): Promise<boolean> {
    throw new Error("GitHubFS::unlink not implemented");
  }
}

/**
 * テスト用のファイルシステム
 */
export class DummyFs implements Fs {

  public static open(){
    return new DummyFs();
  }

  private constructor() {

  }

  public readdir = async (
    path: string,
    options?: string | Object,
  ): Promise<VFile[]> => {return []};

  public async readFile(path: string): Promise<string | Buffer> {
    return path;
  }

  public async writeFile(): Promise<void> {}
}

export interface ThemeIO {
  get(path: string, json?: boolean): any;
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
  public constructor(owner: string, repo: string, token: string | null = null) {
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
    throw new Error('Method not implemented.');
  }

  /**
   * TODO: 全ファイル名の取得
   */
  public async findAll(): Promise<string[]> {
    return [];
  }

  public static parseURL(url: string): {
    owner: string;
    repo: string;
    path: string;
  } {
    const found = url.match(
      /https:\/\/github\.com\/([\w-\.]+)\/([\w-\.]+).git(?:\/(.*))?/,
    );
    if (found == null || !found[1] || !found[2]) {
      throw new Error('invalid github url : ' + url);
    }
    const path = {owner: found[1], repo: found[2], path: found[3]};
    return path;
  }

  /**
   * ファイルを取得
   * @param path 取得するファイルのパス(owner/repo/以下)
   * @param json JSONオブジェクトとして取得するならtrue
   * @returns
   */
  public async get(path: string, json: boolean = false): Promise<any> {
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

/**
 * ローカルファイルの入出力
 */
export class LocalIO implements ThemeIO {
  get(path: string) {
    throw new Error('Method not implemented.');
  }
  put(path: string, data: any): void {
    throw new Error('Method not implemented.');
  }
}
