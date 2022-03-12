import {Octokit} from '@octokit/rest';
import {graphql} from '@octokit/graphql';

import {queryContext} from './gqlAuthDirective';
import {createAppAuth} from '@octokit/auth-app';
import {githubAppPrivateKey} from '@utils/keys';

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

  const query = `
    query {
      viewer {
        repositories(first: 100, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR], affiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
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

  // GitHub AppのInstallation IDを取得する
  const octokit = new Octokit({
    auth: `token ${context.token}`,
  });
  const installations =
    await octokit.apps.listInstallationsForAuthenticatedUser();

  // ヘッダにトークンを設定
  const parameters = {
    headers: {
      authorization: `token ${context.token}`,
    },
  };
  // 他のユーザのリポジトリに権限を与えられている場合、複数のGitHub AppのInstallationが取得できる
  // Instarationごとの処理を並行して行なう
  const results = await Promise.all(
    installations.data.installations.map(async ({id}) => {
      // InstallationIDを使用した認証機構
      const auth = createAppAuth({
        appId: +process.env.GH_APP_ID,
        privateKey: githubAppPrivateKey,
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
  // Instarationごとの結果をひとつのリストにまとめる
  const repositories = results.flat();
  // console.log('repositories',repositories);
  return repositories;
};
