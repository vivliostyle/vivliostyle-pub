import {Octokit} from '@octokit/rest';
import {graphql} from '@octokit/graphql';

import {queryContext} from './gqlAuthDirective';
import {createAppAuth} from '@octokit/auth-app';
import { githubAppPrivateKey } from '@utils/keys';

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
      privateKey: githubAppPrivateKey,
      installationId: installationId,
    });
    // 認証を使ってGarphQLクライアントを作成
    const graphqlWithAuth = graphql.defaults({
      request: {
        hook: auth.hook,
      },
    });

  return {graphqlWithAuth,owner:args.owner,name:args.name,insId:installationId};
  
};

/**
 * リポジトリ内のオブジェクト(Blob|Tree)のリストを返す
 * @param parent 
 * @param args 
 * @param context 
 * @param info 
 * @returns 
 */
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
        ... on Blob {
          abbreviatedOid
          byteSize
          commitResourcePath
          commitUrl
          id
          isBinary
          isTruncated
          oid
          # repository 再帰呼び出しになるので省略
          text
        }
      }
    }
  }
`;

  // APIを実行
  try {
    const result = (await parent.graphqlWithAuth(query, parameters)) as any;
    if(result.repository.object.isBinary) {
      // GitHubのGraphQL APIではisBinaryがtrueのときは
      // textプロパティは空なので、REST APIを使ってバイナリデータを取得してtextプロパティにセットする
      const octokit = new Octokit({
        appId: process.env.GH_APP_ID,
        privateKey: githubAppPrivateKey,
        installationId: parent.insId,
      });
      const blob = await octokit.git.getBlob({
        owner:parent.owner,
        repo:parent.name,
        file_sha: result.repository.object.oid,
      });
      const content = blob.data.content.replaceAll('\n', '');
      result.repository.object.text = content;
    }
    return result.repository.object;
  } catch (err) {
    console.error(err);
    return null;
  }  
}