/**
 * GraphQLのエンドポイント
 */
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import {PageConfig} from 'next';

// GraphQL関連
import {ApolloServer, gql} from 'apollo-server-micro';
import Cors from 'micro-cors';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {mergeTypeDefs} from '@graphql-tools/merge';
import {isNumber} from 'lodash';
import {getRepositories} from '@services/gqlRepositories';
import {
  getRepository,
  getRepositoryObject,
  getRepositoryRef,
} from '@services/gqlRepository';
import {
  authDirectiveTransformer,
  queryContext,
} from '@services/gqlAuthDirective';
import {send} from 'micro';
import {commitContent} from '@services/gqlCommitContent';
import {commitDirectory} from '@services/gqlCommitDirectory';
import {createRef} from '@services/gqlCreateRef';

import GihHubSchema from '../../services/GitHubSchema';

const cors = Cors();

// next.jsのパーサーを停止する
export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

const _typeDefs = gql`
  enum Role {
    ADMIN # 管理者
    USER # ログインユーザ
    NONE # 未ログインユーザ
  }

  """
  アクセス権を制御するディレクティブ
  """
  directive @auth(
    requires: Role = USER # @authとだけ記述したときの初期値はUSER
  ) on OBJECT | FIELD_DEFINITION

  type Result {
    state: Boolean
    message: String
  }

  type User @auth {
    name: String
  }

  input CommitParams {
    owner: String!
    repo: String!
    branch: String!
    # oldPathとnewPathが有効で同一なら更新、同一でなければコピー
    oldPath: String # undefined|nullなら新規作成
    newPath: String # もしリポジトリに同名の既存ファイルがあればエラー
    newContent: String # undefined|nullならリポジトリのoldPathから取得、無ければ空文字列
    removeOldPath: Boolean # false trueならoldPathのファイルを削除
    #allowOverWrite: Boolean # true falseならnewPathが既に存在していればエラー 他者のコミットで同名のファイルが追加されている可能性があるため
    oldSha: String # 既存ファイルのハッシュ 他者による更新の検知に使用 oldPathのハッシュ値と一致しなければエラー
    message: String # コミットメッセージ
  }

  extend type Blob {
    """
    firestoreとの連携用にBlob型にsessionIdを取得するためのフィールドを追加
    """
    sessionId: String!
  }

  type Query @auth {
    """
    ユーザリストは管理者のみ取得可能(未実装)
    """
    users: [User!]! @auth(requires: ADMIN)

    """
    ログイン中のユーザがアクセス可能なリポジトリのリストを取得
    """
    repositories: [Repository]!

    """
    リポジトリ名 owner/repoを指定して特定のリポジトリの情報を取得
    """
    repository(owner: String!, name: String!): Repository
  }

  type Mutation @auth {
    """
    指定ブランチにコミットを作成(未実装)
    """
    createCommitOnBranch(
      params: CreateCommitOnBranchInput
    ): CreateCommitOnBranchPayload!

    """
    ブランチを作成
    """
    createRef(params: CreateRefInput): CreateRefPayload!

    """
    ファイル管理 パラメータによって異なる動作をする
    createCommitOnBranchに移行予定
    # commitContentの利用例
    create file:       commitContent({owner, repo, branch, newPath, newContent})
    update content:    commitContent({owner, repo, branch, oldPath, newContent})
    duplicate file:    commitContent({owner, repo, branch, oldPath, newPath})
    move(rename) file: commitContent({owner, repo, branch, oldPath, newPath, removeOldPath})
    delete file:       commitContent({owner, repo, branch, oldPath, removeOldPath})
    """
    commitContent(params: CommitParams!): Result!

    """
    ディレクトリ管理 CommitParamsのnewContentは指定されても無視する
    createCommitOnBranchに移行予定
    # commitDirectoryの利用例
    create directory:       commitContentを使って.gitkeepファイルを作成する
    duplicate directory:    commitDirectory({owner, repo, branch, oldPath, newPath});
    move(rename) directory: commitDirectory({owner, repo, branch, oldPath, newPath, removeOldPath});
    delete directory:       commitDirectory({owner, repo, branch, oldPath, removeOldPath});
    """
    commitDirectory(params: CommitParams!): Result!
  }
`;

const typeDefs = mergeTypeDefs([GihHubSchema, _typeDefs]);

const resolvers = {
  RepositoryOwner: {
    // RepositoryOwnerインターフェースの実装クラス名を解決する
    __resolveType(owner: any, context: any, info: any) {
      // 個別のリゾルバの中で__typenameを返しているならそのまま返せば良い
      // User(https://docs.github.com/en/graphql/reference/objects#user)か
      // Organization(https://docs.github.com/en/graphql/reference/objects#organization)になる
      return owner.__typename;
    },
  },
  GitObject: {
    // GitObjectインターフェースの実装クラス名を解決する
    __resolveType(owner: any, context: any, info: any) {
      // 個別のリゾルバの中で__typenameを返しているならそのまま返せば良い
      return owner.__typename;
    },
  },
  Query: {
    // parent  親のリゾルバ呼び出しの結果
    // args    リゾルバのフィールドの引数
    // context 各リゾルバが読み書きできるカスタムオブジェクト
    repositories: getRepositories,
    repository: getRepository,
  },
  Mutation: {
    commitContent,
    commitDirectory,
    createRef,
  },
  Repository: {
    // この形式でリゾルバを構築すると楽だがGitHubへはobject,refごとにリクエストが行なわれる
    // TODO: getRepositoryメソッドの中で文字列組み立てのほうがリクエスト回数は減らせるのでは
    object: getRepositoryObject,
    ref: getRepositoryRef,
  },
};

const schemaSrc = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const schema = authDirectiveTransformer(schemaSrc);

export default cors(async function handler(req, res) {
  const context = {} as queryContext;

  const decryptedToken = await getDecryptedToken(req, res);
  if (!decryptedToken || isNumber(decryptedToken)) {
    context.roles = [];
    return send(res, 401);
  } else {
    // GraphQLのリゾルバで使えるようにGitHubのトークンをcontextにセットする
    context.token = decryptedToken.decrypted;
    context.uid = decryptedToken.uid;
    context.roles = ['USER'];
  }

  // console.log('context:',context, decryptedToken, req.headers);

  const apolloServer = new ApolloServer({
    schema,
    formatError: (error) => {
      console.error(error?.extensions);
      return error;
    },
    context,
  });

  if (req.method === 'OPTIONS') {
    res.end();
    return false;
  }
  await apolloServer.start();

  await apolloServer.createHandler({
    path: '/api/graphql',
  })(req, res);
});

/**
 * IDトークン処理
 * @param req
 * @param res
 * @returns
 */
async function getDecryptedToken(
  req: any,
  res: any,
): Promise<{decrypted: string; uid: string} | number> {
  const idToken = req.headers['x-id-token'];
  if (!idToken) {
    return 401;
  }
  let idTokenDecoded: firebaseAdmin.auth.DecodedIdToken;
  try {
    const tokenString = Array.isArray(idToken) ? idToken[0] : idToken;
    idTokenDecoded = await firebaseAdmin.auth().verifyIdToken(tokenString);
  } catch (error) {
    return 400;
  }

  if (!idTokenDecoded?.githubAccessToken) {
    return 405;
  }
  const decrypted = decrypt(idTokenDecoded.githubAccessToken);
  return {decrypted, uid: idTokenDecoded.uid};
}
