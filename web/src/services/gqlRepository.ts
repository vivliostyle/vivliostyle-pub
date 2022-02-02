import {Octokit} from '@octokit/rest';
import {Endpoints} from '@octokit/types';

import {queryContext} from './gqlAuthDirective';

type GithubReposApiResponse =
  Endpoints['GET /user/installations/{installation_id}/repositories']['response']['data']['repositories'];

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
