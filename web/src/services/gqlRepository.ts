import {Octokit} from '@octokit/rest';
import {graphql} from '@octokit/graphql';

import {queryContext} from './gqlAuthDirective';
import {createAppAuth} from '@octokit/auth-app';

/**
 * リポジトリのリストを返す
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const getRepositories = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
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
  const parameters = {
    headers: {
      authorization: `token ${context.token}`,
    },
  };

  const query = `
    query {
      viewer {
        repositories(first: 100, ownerAffiliations: [OWNER]) {
          totalCount
          nodes {
            ... on Repository {
              id
              name
              owner {
                __typename
                login
              }
              defaultBranchRef {
                id
                name
              }
              isPrivate
              refs(first: 100, refPrefix: "refs/heads/") {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;
  const results = await Promise.all(
    // 他のユーザのリポジトリに権限を与えられている場合、複数のGitHub AppのInstallationが取得できる
    installations.data.installations.map(async ({id}) => {
      // InstallationIDを使用した認証機構
      const auth = createAppAuth({
        appId: process.env.GH_APP_ID,
        privateKey: process.env.GH_APP_PRIVATEKEY,
        installationId: id,
      });
      // 認証を使ってGarphQLクライアントを作成
      const graphqlWithAuth = graphql.defaults({
        request: {
          hook: auth.hook,
        },
      });
      // APIを実行
      const result = (await graphqlWithAuth(query, parameters)) as any;
      return result.viewer.repositories.nodes;
    }),
  );
  // console.log(results.flat());
  const repositories = results.flat();
  return repositories;
};
