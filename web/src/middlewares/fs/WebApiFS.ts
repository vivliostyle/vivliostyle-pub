import {
  ApolloClient,
  gql,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import {User} from '@firebase/auth';
import {initializeApp} from 'firebase/app';
import {
  doc,
  DocumentReference,
  Firestore,
  getFirestore,
} from 'firebase/firestore';
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
  root: string = '';
  client: ApolloClient<NormalizedCacheObject>;
  token: string;
  db: Firestore;

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
    const idToken = await user.getIdToken();
    const client = new ApolloClient({
      uri: '/api/graphql',
      cache: new InMemoryCache(),
      headers: {
        'x-id-token': idToken,
      },
    });

    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);

    const fs: WebApiFs = new WebApiFs(
      user,
      owner,
      repo,
      branch,
      idToken,
      client,
      db,
    );
    return fs;
  }

  /**
   * コンストラクタ
   * @param user
   * @param owner
   * @param repo
   * @param branch
   */
  private constructor(
    user: User,
    owner: string,
    repo: string,
    branch: string,
    idToken: string,
    client: ApolloClient<NormalizedCacheObject>,
    db: Firestore,
  ) {
    this.user = user;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.tree_sha = '';
    this.token = idToken;
    this.client = client;
    this.db = db;
  }

  /**
   * リポジトリからファイルを読み込む
   * Application Cacheの場合は使用しないかも
   * @param path
   * @param options {hasSession?: boolean セッション(Firestoreの参照)を取得するならtrue}
   * @returns
   */
  public async readFile(
    path: string,
    options?: {hasSession?: boolean},
  ): Promise<
    string | Buffer | {content: string | Buffer; session: DocumentReference}
  > {
    const sessionId = options?.hasSession? 'sessionId' : '';

    const result = await this.client.query({
      query: gql`
        query getContent($owner: String!, $name: String!, $expr: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expr) {
              __typename
              ... on Blob {
                id
                oid
                isBinary
                text
                ${sessionId}
              }
            }
          }
        }
      `,
      variables: {
        owner: this.owner,
        name: this.repo,
        expr: `${this.branch}:${path}`,
      },
    });
    console.log('readFile result', path, result);
    if (result.data.repository.object === null ) {
      throw new Error("file not found");
    }
    let content;
    if (result.data.repository.object.isBinary) {
      const binaryData = Buffer.from(
        result.data.repository.object.text,
        'base64',
      );
      content = binaryData;
    } else {
      content = result.data.repository.object.text;
    }
    if (options?.hasSession) {
      const id = result.data.repository.object.sessionId;
      const session = doc(this.db, 'users', this.user.uid, 'sessions', id);
      return {content, session};
    } else {
      return content;
    }
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
    throw new Error('WebApiFS::writeFile : not implemented');
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
    if (options) {
      throw new Error('WebApiFs::readdir options not implemented');
    } // オプション未実装

    const result = await this.client.query({
      query: gql`
        query getEntries($owner: String!, $name: String!, $expr: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expr) {
              __typename
              ... on Tree {
                entries {
                  type
                  name
                  extension
                  isGenerated
                  mode
                  oid
                  path
                }
              }
            }
          }
        }
      `,
      variables: {
        owner: this.owner,
        name: this.repo,
        expr: `${this.branch}:${path}`,
      },
    });
    console.log('readdir', result);
    if(!result.data.repository.object.entries) {
      return [];
    }
    const files = result.data.repository.object.entries.map((entry: any) => {
      // 取得したGitのファイル情報をVFile形式に変換する
      // この時点ではファイルの内容は取得していない
      return new VFile({
        fs: this,
        dirname: path,
        type:
          entry.type === 'blob'
            ? 'file'
            : entry.type === 'tree'
            ? 'dir'
            : 'others',
        name: entry.name,
        hash: entry.oid,
      });
    });
    return files;
  }

  /**
   * ファイル、ディレクトリの削除
   * @param path
   */
  public async unlink(path: string): Promise<boolean> {
    throw new Error('WebApiFS::unlink not implemented');
  }
}
