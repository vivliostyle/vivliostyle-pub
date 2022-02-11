import {User} from '@firebase/auth';
import {initializeApp} from 'firebase/app';
import {doc, DocumentReference, getFirestore} from 'firebase/firestore';
import {ContentOfRepositoryApiResponse} from 'pages/api/github/contentOfRepository';
import {GithubRequestSessionApiResponse} from 'pages/api/github/requestSession';
import {CommitsOfRepositoryApiResponse} from 'pages/api/github/tree';
import {Fs, VFile} from 'theme-manager';

/**
 * /api/github/* へのWeb APIアクセスを抽象化して提供する仮想FileSystemクラス
 */
export class WebApiFs implements Fs {
  user: User;
  owner: string;
  repo: string;
  branch: string;
  tree_sha: string;
  root:string = "";
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
      throw new Error(
        `WebApiFs:invalid repository:${user}/${owner}/${repo}/${branch}`,
      );
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
   * @param json // 現在非対応 TODO: 必要があれば対応する
   * @returns
   */
  public async readFile(
    path: string,
    json?: boolean,
  ): Promise<string | Buffer> {
    if (json) {
      throw new Error('WebApiFs::readFile json parameter not implemented');
    } // オプション未実装
    const idToken = await this.user.getIdToken();
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
          'x-id-token': idToken,
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
      throw new Error(`WebApiFs:Content type is not file`);
    }
    return content.content;
  }

  /**
   * ファイルパスからfirestoreのsession idを取得する
   * @param filePath
   * @returns
   */
  private async getSessionId(filePath: string) {
    const {id} = (await fetch('/api/github/requestSession', {
      method: 'POST',
      body: JSON.stringify({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        path: filePath,
      }),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await this.user.getIdToken(),
      },
    }).then((r) => r.json())) as GithubRequestSessionApiResponse;
    return id;
  }

  /**
   * ファイルパスに対応するfirestoreのsessionオブジェクトを取得する
   * @param filePath
   * @returns
   */
  public async getFileSession(filePath: string): Promise<DocumentReference> {
    // Firebase Web version 9対応
    const id = await this.getSessionId(filePath);
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const docRef = doc(db, 'users', this.user.uid, 'sessions', id);
    return docRef;
  }

  /**
   * リポジトリにファイルを追加してコミットする
   * 編集したファイルのコミットとは別処理なので注意
   * 編集ファイルのコミットはuseCurrentFileを参照
   * @param file filename or file descriptor
   * @param data
   * @param options encoding|mode|flag|signal
   */
  public async writeFile(
    file: string | Buffer | URL,
    data: any,
    options?: any,
  ): Promise<void> {
    throw new Error("WebApiFS::writeFile : not implemented");
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
  ): Promise<VFile[]> {
    console.log('readdir',path);
    if (options) {
      throw new Error('WebApiFs::readdir options not implemented');
    } // オプション未実装
    const token = await this.user.getIdToken();
    const resp = await fetch(
      `/api/github/tree?${new URLSearchParams({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        path: path, // サブディレクトリのときに指定する
      })}`,
      {
        method: 'GET',
        headers: {
          'x-id-token': token,
        },
      },
    );
    path = path ?? '/';
    if(resp.status == 409) {
      // リポジトリにファイルが存在しない
      return [];
    }
    const data = (await resp.json()) as CommitsOfRepositoryApiResponse;
    // console.log('data', data.tree);
    const files = data.tree.map((tree) => {
      // console.log(tree);
      // 取得したGitのファイル情報をVFile形式に変換する
      // この時点ではファイルの内容は取得していない
      return new VFile({
        fs: this,
        dirname: path,
        type:
          tree.type === 'blob'
            ? 'file'
            : tree.type === 'tree'
            ? 'dir'
            : 'others',
        name: tree.path!,
        hash: tree.sha,
      });
    });
    return files;
  }

  /**
   * ファイル、ディレクトリの削除
   * @param path 
   */
  public async unlink(path:string):Promise<boolean> {
    throw new Error("WebApiFS::unlink not implemented");
  }
}
