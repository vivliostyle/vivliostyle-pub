import {Octokit} from '@octokit/rest';
import {queryContext} from './gqlAuthDirective';

/**
 * ファイルを削除する
 * @param parent
 * @param args {owner, repo, oldName, newName}
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const deleteContent = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
): Promise<{state: boolean}> => {
  // console.log("delete",parent,args,context,info);

  // GitHubで削除を行なう

  if (!context.token) {
    // Userのトークンが無ければ空のリストを返す
    // TODO: エラー処理
    return {state: false};
  }
  const owner = args.owner;
  const repo = args.repo;
  const name = args.name;
  const sha = args.sha;

  // console.log('getRepositories', parent, args, context, props);
  const octokit = new Octokit({
    auth: `token ${context.token}`,
  });

  // TODO: GitHubのGraphQL APIを使って書き直す
  const result = await octokit.request(
    'DELETE /repos/{owner}/{repo}/contents/{path}',
    {
      owner,
      repo,
      path: name,
      message: 'delete file',
      sha,
    },
  );
  // console.log("gqlDelete::delete result", result);
  const state = result.status === 200;
  return {state};
};
