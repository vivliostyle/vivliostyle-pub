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
import {isNumber} from 'lodash';
import { getRepositories } from '@services/gqlRepository';
import { authDirectiveTransformer, queryContext } from '@services/gqlAuthDirective';
import { send } from 'micro';
import { renameContent } from '@services/gqlRename';
import { deleteContent } from '@services/gqlDelete';

const cors = Cors();

// next.jsのパーサーを停止する
export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

const typeDefs = gql`
  enum Role {
    ADMIN # 管理者
    USER # ログインユーザ
    NONE # 未ログインユーザ
  }

  # アクセス権を制御するディレクティブ
  directive @auth(
    requires: Role = USER # @authとだけ記述したときの初期値はUSER
  ) on OBJECT | FIELD_DEFINITION

  type Query @auth {
    # ユーザリストは管理者のみ取得可能
    users: [User!]! @auth(requires: ADMIN)
    # ログイン中のユーザがアクセス可能なリポジトリのリストを取得
    repositories: [Repository]!
    # リポジトリ名 owner/repoを指定して特定のリポジトリの情報を取得
    repository(name: String!): Repository
  }

  type Result {
    state: Boolean
  }

  type Mutation @auth {
    renameContent(owner: String!, repo: String!, branch: String!, oldPath: String!, newPath: String!, sha: String!): Result
    deleteContent(owner: String!, repo: String!, branch: String!, name: String!, sha: String!): Result
  }
  type User @auth {
    name: String
  }
  type Repository @auth {
    owner: String!
    repo: String!
    branches: [String]!
    defaultBranch: String!
    full_name: String!
    id: Int!
    node_id: String!
    private: Boolean!
  }
  type Branch @auth {
    name: String
    files: [File]!
  }
  type File @auth {
    name: String
    type: String # 'file','dir'
  }
`;

const resolvers = {
  Query: {
    // parent  前のリゾルバ呼び出しの結果
    // args    リゾルバのフィールドの引数
    // context 各リゾルバが読み書きできるカスタムオブジェクト
    // async users(parent: {}, args: {}, context: queryContext) {
    //   // console.log('parent', parent);
    //   // console.log('args', args);
    //   // console.log('context', context);
    //   return [{name: 'name1'}, {name: 'name2'}];
    // },
    async repositories(
      parent: any,
      args: any,
      context: queryContext,
      info: any,
    ) {
      try {
        const repositories = await getRepositories(parent, args, context, info);
        // console.log('sv repositories',repositories);
        return repositories;
      }catch(err){
        // TODO: エラー処理
        console.error(err);
        return [];
      }
    },
  },
  Mutation: {
    renameContent,
    deleteContent
  }
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
    context.token = decryptedToken;
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
async function getDecryptedToken(req: any, res: any): Promise<string | number> {
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
  return decrypted;
}
