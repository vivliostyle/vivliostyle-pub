/**
 * GraphQLのエンドポイント
 */
import firebaseAdmin from '@services/firebaseAdmin';
import {decrypt} from '@utils/encryption';
import {PageConfig} from 'next';

// GraphQL関連
import {ApolloServer, AuthenticationError, gql} from 'apollo-server-micro';
import Cors from 'micro-cors';
import {defaultFieldResolver, GraphQLSchema} from 'graphql';
import {getDirective, MapperKind, mapSchema} from '@graphql-tools/utils';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {isNumber} from 'lodash';
import {Octokit} from '@octokit/rest';
import {GithubReposApiResponse} from './github/repos';

const cors = Cors();

type queryContext = {
  roles?: string[];
  token?: string;
};

// next.jsのパーサーを停止する
export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

/**
 * 認証認可
 */
function executeAuth(fieldConfig: any, authDirective: any) {
  const {resolve = defaultFieldResolver} = fieldConfig;
  // 項目の処理を上書きする
  fieldConfig.resolve = async function (...args: any[]) {
    const requiredRole = authDirective.requires;
    // console.log(requiredRole);
    if (!requiredRole) {
      // 必須Roleが指定されていなければデフォルトの処理を行なう
      return resolve.apply(this, args);
    }

    const context = args[2];
    // console.log('context',context);
    if (!context || !context.roles || !context.roles.includes(requiredRole)) {
      throw new AuthenticationError('not authorized');
    }

    return resolve.apply(this, args);
  };
  return fieldConfig;
}

/**
 * @authを処理できるスキーマに書き換える
 * @param schema
 * @returns
 */
function authDirectiveTransformer(schema: GraphQLSchema) {
  const directiveName = 'auth';
  const typeDirectiveArgumentMaps: Record<string, any> = {};

  return mapSchema(schema, {
    // 型単位での認可が出来るようにするため
    // スキーマの型定義に付与されている@authディレクティブを記録しておく
    [MapperKind.TYPE]: (typeName) => {
      // console.log('typeName\n',typeName);
      const authDirective = getDirective(schema, typeName, directiveName)?.[0];
      if (authDirective) {
        typeDirectiveArgumentMaps[typeName.toString()] = authDirective;
      }
      return typeName;
    },
    // スキーマのプロパティを処理する
    [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
      // console.log('fieldConfig\n',fieldConfig,_fieldName,typeName);
      const authDirective =
        getDirective(schema, fieldConfig, directiveName)?.[0] ?? // 項目毎の@authディレクティブを取得する
        typeDirectiveArgumentMaps[typeName]; // 項目に指定されていなければ型の@authディレクティブも探す
      if (authDirective) {
        // @authが指定されている
        return executeAuth(fieldConfig, authDirective);
      }
      return fieldConfig;
    },
  });
}

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
    themes: [Theme!]!
    theme(name: String): Theme
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
  type Theme @auth {
    name: String
    style: String
  }
`;

const resolvers = {
  Query: {
    // parent  前のリゾルバ呼び出しの結果
    // args    リゾルバのフィールドの引数
    // context 各リゾルバが読み書きできるカスタムオブジェクト
    async users(parent: {}, args: {}, context: queryContext) {
      // console.log('parent', parent);
      // console.log('args', args);
      // console.log('context', context);
      return [{name: 'name1'}, {name: 'name2'}];
    },
    async repositories(
      parent: any,
      args: any,
      context: queryContext,
      info: any,
    ) {
      try {
        const repositories = await getRepositories(parent, args, context, info);
        console.log('sv repositories',repositories);
        return repositories;
      }catch(err){
        console.error(err);
        return [];
      }
    },
    async themes(parent: {}, args: {}, context: queryContext) {
      return [
        {name: 'theme1', style: 'style.css'},
        {name: 'theme2', style: 'style2.css'},
      ];
    },
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
  } else {
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
 * リポジトリのリストを返す
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
const getRepositories = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
  if (!context.token) {
    return [];
  }
  const props = info.fieldNodes[0].selectionSet.selections.map(
    (f: any) => f.name.value,
  );
  // console.log('getRepositories', parent, args, context, props);
  const octokit = new Octokit({
    auth: `token ${context.token}`,
  });
  // TODO: GitHubのGraphQL APIを使って書き直す
  const installations =
    await octokit.apps.listInstallationsForAuthenticatedUser();
  const repos = await Promise.all(
    installations.data.installations.map(async ({id}) => {
      const repos =
        await octokit.apps.listInstallationReposForAuthenticatedUser({
          installation_id: id,
        });
      return repos.data.repositories as unknown as GithubReposApiResponse;
    }),
  );
  const repositoriesPromisses = repos
    .reduce((acc, v) => [...acc, ...v], [])
    .map(async (r) => {
      // branchesが取得リストに含まれていれば
      const branchesData = props.includes('branches')
        ? (
            await octokit.repos.listBranches({
              owner: r.owner!.login,
              repo: r.name!,
            })
          ).data
        : undefined;
      const branches = branchesData?.map((b) => b.name);
      // defaultBranchが取得リストに含まれていれば
      const defaultBranch = props.includes('defaultBranch')
        ? await (
            await octokit.repos.get({owner: r.owner!.login, repo: r.name!})
          ).data.default_branch
        : undefined;
      
      return {
        owner: r.owner!.login,
        repo: r.name,
        full_name: r.full_name,
        id: r.id,
        node_id: r.node_id,
        private: r.private,
        branches,   
        defaultBranch,
      };
    });
  const repositories = await Promise.all(repositoriesPromisses);
  // console.log(repositories);
  return repositories;
};

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
