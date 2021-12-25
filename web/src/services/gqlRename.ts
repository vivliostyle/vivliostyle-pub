import {Octokit} from '@octokit/rest';

import {queryContext} from './gqlAuthDirective';

/**
 * ファイルやディレクトリをリネームする
 * @param parent
 * @param args {owner, repo, oldName, newName}
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const renameContent = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {

    console.log("rename",parent,args,context,info);

    // GitHubでリネームを行なう

  if (!context.token) {
    // Userのトークンが無ければ空のリストを返す
    // TODO: エラー処理
    return false;
  }
  const owner = args.owner;
  const repo = args.repo;
  const branch = args.branch;
  const oldPath = args.oldPath;
  const newPath = args.newPath;
  const sha = args.sha;

  
  // console.log('getRepositories', parent, args, context, props);
  const octokit = new Octokit({
    auth: `token ${context.token}`,
  });

  // リネーム先の作成
  const isExist = await (async () => {
    try {
      const {data} = await octokit.repos.getContent({owner, repo, path:newPath, ref: branch});
      if (!Array.isArray(data) && data.type === 'file') return true;
    } catch (error) { return false; }
    return false;
  })();
  if(isExist) {
    // 同名のファイルが既に存在するなら失敗
    return {state: false};
  }

  // 既存ファイルの内容を取得する
  const {data} = await octokit.repos.getContent({owner, repo, path:oldPath, ref: branch});

  if(! ("content" in data) ) { return {state: false} }
  // 新しいファイルを追加する
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path:newPath, branch,
    sha,
    content: data.content!,
    message: "create file",
  });

  // リネーム元の削除

  // TODO: GitHubのGraphQL APIを使って書き直す
  const result = await octokit.request(
    'DELETE /repos/{owner}/{repo}/contents/{path}',
    {
      owner,
      repo,
      branch,
      path: oldPath,
      message: 'delete file',
      sha,
    },
  );
  // console.log("gqlDelete::delete result", result);
  const state = result.status === 200;
  return {state};
};
