import {User} from '@firebase/auth';
import {Dirent} from 'fs-extra';
import {ContentOfRepositoryApiResponse} from 'pages/api/github/contentOfRepository';
import {CommitsOfRepositoryApiResponse} from 'pages/api/github/tree';
import {Fs} from 'theme-manager';

/**
 * /api/github/* へのWeb APIアクセスを抽象化して提供するクラス
 */
export class WebApiFs implements Fs {
  user: User;
  owner: string;
  repo: string;
  branch: string;
  tree_sha: string;
  /**
   * キャッシュを開いてFsインターフェースを実装したオブジェクトを返す
   * @param cacheName キャッシュ名
   * @returns
   */
  public static async open({
    user,
    owner,
    repo,
    branch,
  }: {
    user: User;
    owner: string;
    repo: string;
    branch: string;
  }): Promise<WebApiFs> {
    if (!(user && owner && repo && branch)) {
      throw new Error('invalid repository');
    }
    const fs: WebApiFs = new WebApiFs(user, owner, repo, branch);
    return fs;
  }

  /**
   * コンストラクタ
   * @param user
   * @param owner
   * @param repo
   * @param branch
   */
  private constructor(user: User, owner: string, repo: string, branch: string) {
    this.user = user;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.tree_sha = '';
  }

  /**
   * リポジトリからファイルを読み込む
   * Application Cacheの場合は使用しないかも
   * @param path
   * @param json // jsonをオブジェクト化して取得するならtrue
   * @returns
   */
  public async readFile(
    path: string,
    json?: boolean | undefined,
  ): Promise<string | Buffer> {
    const response = await fetch(
      `/api/github/contentOfRepository?${new URLSearchParams({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        path,
      })}`,
      {
        headers: {
          'content-type': 'application/json',
          'x-id-token': await this.user.getIdToken(),
        },
      },
    );
    if (response.status === 403) {
      throw new Error(`403:${path}`);
    }
    const content =
      (await response.json()) as unknown as ContentOfRepositoryApiResponse;
    if (Array.isArray(content) || !('content' in content)) {
      // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
      throw new Error(`Content type is not file`);
    }
    return content.content;
  }

  /**
   * リポジトリにファイルを追加してコミットする
   * @param file filename or file descriptor
   * @param data
   * @param options encoding|mode|flag|signal
   */
  public async writeFile(
    file: string | Buffer | URL,
    data: any,
    options?: any,
  ): Promise<void> {
    //   const filePath = upath.join(this.root, file);
    //   const contentType = (mime.lookup(filePath) ?? '') as string;
    //   const headers = new Headers();
    //   headers.append('content-type', contentType);
    // //   console.log('headers', file, contentType);
    //   await this.cache.delete(filePath);
    //   await this.cache.put(filePath, new Response(data, {headers}));
  }

  /**
   * リポジトリにあるファイルの一覧を取得する
   * @param path
   * @param options
   * @param callback
   */
  public async readdir(
    path: string, // TODO: pathからtree_shaを取得する
    options?: string | Object,
  ): Promise<Dirent[]> {
    const token = await this.user.getIdToken();
    const resp = await fetch(
      `/api/github/tree?${new URLSearchParams({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        tree_sha: this.tree_sha, // サブディレクトリのときに指定する
      })}`,
      {
        method: 'GET',
        headers: {
          'x-id-token': token,
        },
      },
    );
    const data = (await resp.json()) as CommitsOfRepositoryApiResponse;
    // console.log('data', data.tree);
    const files = data.tree.map((tree) => {
      // console.log(tree);
      // 取得したGitのファイル情報をDirent形式に変換する
      return {
        ...tree,
        isFile: () => tree.type === 'blob',
        isDirectory: () => tree.type === 'tree',
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        isSymbolicLink: () => false,
        name: tree.path,
      } as Dirent;
    });
    return files;
  }
}
