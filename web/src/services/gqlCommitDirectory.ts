import {queryContext} from './gqlAuthDirective';
import {graphql} from '@octokit/graphql';

const getFiles = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  getContents: boolean,
) => {
  let files: {path:string}[] = [];
  let contents: {[index: string]: string} = {};

  // ファイルの内容を取得する
  const contentQuery = getContents
    ? `
    object {
     ... on Blob {
        isBinary
        text
      }
    }
  `
    : '';

  const result = (await graphql(
    `
  query getFiles($owner: String!, $repo: String!, $pathWithBranch: String!) {
    repository(owner: $owner, name: $repo) {
      name
      object(expression: $pathWithBranch) {
        ... on Tree {
          entries {
            path
            type
            ${contentQuery}
          }
        }
      }
    }
  }
  `,
    {
      owner,
      repo,
      pathWithBranch: `${branch}:${path}`,
      headers: {
        authorization: `token ${token}`,
      },
    },
  )) as any;
  // console.log('getFiles result', JSON.stringify(result));
  const entries = result.repository.object.entries as any[];
  for (const entry of entries) {
    if (entry.type == 'blob') {
      // console.log(entry.path);
      files.push({path:entry.path});
    } else if (entry.type == 'tree') {
      // console.log(entry.path);
      const subFiles = await getFiles(
        token,
        owner,
        repo,
        branch,
        entry.path,
        getContents,
      );
      Array.prototype.push.apply(files, subFiles.files);
      contents = {...contents, ...subFiles.contents};
    }
  }
  return {files, contents};
};

/**
 * Githubリポジトリ上のディレクトリを管理する
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const commitDirectory = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
  // console.log('commitContent', parent, args, context, info);

  if (!context.token) {
    // Userのトークンが無ければ失敗
    // TODO: エラー処理
    return {state: false, message: 'ユーザトークンが異常です'};
  }
  const params = args.params;
  // 必須項目
  const owner = params.owner; // リポジトリオーナー名
  const repo = params.repo; // リポジトリ名
  const branch = params.branch; // ブランチ名
  const message = params.message; // コミットメッセージ

  // console.log("repos", args, owner, repo, branch);

  // オプション項目
  const oldPath = params.oldPath; // 既存パス(コンテンツ更新対象、移動/コピー元、削除対象)
  let newPath = params.newPath; // 新規パス(新規作成、移動/コピー先)
  // let newContent = params.newContent; // Base64エンコードされたコンテンツ(更新内容、新規作成内容)
  const removeOldPath = params.removeOldPath ?? false; // trueならoldPathで指定されたファイルを最後に削除

  const files = await getFiles(
    context.token,
    owner,
    repo,
    branch,
    oldPath,
    false,
  );
  console.log(files);

  // ブランチのOIDを取得する
  // TODO: OIDはフロント側で管理する 他者によってコミットが進んでいたらどうするか。
  const branchObj = (await graphql(`
    query getBranchOid(
      $owner: String!,
      $repo: String!, 
      $qualifiedName: String!, 
    ) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $qualifiedName) {
          target {
            ... on Commit {
              oid
            }
          }
        }
      }
    }
  `,
    {
      owner,
      repo,
      qualifiedName: `refs/heads/${branch}`,
      headers: {
        authorization: `token ${context.token}`,
      },
    },
  )) as any;
  // 最新のコミットのObjectID
  const headOid = branchObj.repository.ref.target.oid;


  const additions:any[] = [];
  const deletions = removeOldPath ? files.files : [];
  const result = await graphql(
    `
      mutation commitContents(
        $repositoryNameWithOwner: String!
        $branch: String!
        $message: String!
        $additions: [FileAddition]
        $deletions: [FileDeletion]
        $headOid: String!
      ) {
        createCommitOnBranch(
          input: {
            branch: {
              repositoryNameWithOwner: $repositoryNameWithOwner
              branchName: $branch
            }
            message: {headline: $message}
            fileChanges: {additions: $additions, deletions: $deletions}
            expectedHeadOid: $headOid
          }
        ) {
          # TODO: 対象ブランチ、ディレクトリのファイルリストを返せるようにする
          commit {
            # return values
            oid # The Git object ID. 次のコミットにはこの値が必要
          }
        }
      }
    `,
    {
      headers: {
        authorization: `token ${context.token}`,
      },
      repositoryNameWithOwner: `${owner}/${repo}`,
      branch,
      message,
      additions,
      deletions,
      headOid,
    },
  );
  console.log('gql result', result);

  // TODO: 更新後のbranchハッシュを返す
  return {state: true, message: 'OK'};
};
