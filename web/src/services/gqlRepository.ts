import {Octokit} from '@octokit/rest';
import {graphql} from '@octokit/graphql';

import {queryContext} from './gqlAuthDirective';
import {createAppAuth} from '@octokit/auth-app';

/**
 * 任意のパスの情報を返す
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const getRepository = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
  // console.log(
  //   'getRepository',
  //   'parent',
  //   parent,
  //   'args',
  //   args,
  //   'context',
  //   context /*,"info",info*/,
  // );
  if (!context.token) {
    // Userのトークンが無ければ空のリストを返す
    // TODO: エラー処理
    return [];
  }
  // GitHub AppのInstallation IDを取得する
  const octokit = new Octokit({
    auth: `token ${context.token}`,
  });
  const installations =
    await octokit.apps.listInstallationsForAuthenticatedUser();
    const installation = installations.data.installations.find(
      (ins) => ins.account?.login === args.owner,
    );
    if(! installation) {
      // TODO: エラー処理
      return null;
    }
    const installationId = installation?.id;
    // InstallationIDを使用した認証機構
    const auth = createAppAuth({
      appId: process.env.GH_APP_ID,
      privateKey: process.env.GH_APP_PRIVATEKEY,
      installationId: installationId,
    });
    // 認証を使ってGarphQLクライアントを作成
    const graphqlWithAuth = graphql.defaults({
      request: {
        hook: auth.hook,
      },
    });

  return {graphqlWithAuth,owner:args.owner,name:args.name};
  
};

export const getRepositoryObject = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
)=>{
  
  // console.log("getRepositoryObject", parent, args, context);

  const parameters = {
    owner: parent.owner,
    name: parent.name,
    expr: args.expression,
  };

  const query = `
  query getEntries($owner: String!, $name: String!, $expr: String!) {
    repository(owner: $owner, name: $name) {
      __typename
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
`;


  // APIを実行
  try {
    const result = (await parent.graphqlWithAuth(query, parameters)) as any;
    // console.log('query result',result);
    return result.repository.object;
  } catch (err) {
    console.error(err);
    return null;
  }  
}