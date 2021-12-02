import {Fs, VFile} from 'theme-manager';

/**
 * GitHubの特定のリポジトリを読み書きする
 */
export class GitHubFs implements Fs {
  owner: string;
  repo: string;
  dir: string;
  token: string;
  root: string = "";

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
  ): Promise<VFile[]> => {
    return [];
  };

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
    // const content = await fetchGhContent({
    //   owner: this.owner,
    //   repo: this.repo,
    //   path,
    //   token: this.token,
    //   json,
    // });

    // return content;
    throw new Error("GitHubFs::readFile not implemented");
  }

  /**
   * ファイルを書き込む
   */
  public async writeFile(): Promise<void> {
    throw new Error('GitHubFS::writeFile not implemented');
  }

  /**
   * ファイルを削除する
   * @returns
   */
  public async unlink(): Promise<boolean> {
    throw new Error('GitHubFS::unlink not implemented');
  }
}
