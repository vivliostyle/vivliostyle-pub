import {queryContext} from './gqlAuthDirective';
import {graphql} from '@octokit/graphql';
import { Octokit } from '@octokit/rest';



/**
 * Githubリポジトリ上のファイルを管理する
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const commitContent = async (
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
  let newContent = params.newContent; // Base64エンコードされたコンテンツ(更新内容、新規作成内容)
  const removeOldPath = params.removeOldPath ?? false; // trueならoldPathで指定されたファイルを最後に削除

  // console.log('commitContent',owner,repo,branch,message,oldPath,newPath,newContent,removeOldPath);

  // 複製/移動/リネームのための既存ファイルのコンテントを取得するクエリ文字列
  let oldContentQuery = '';
  let oldPathWithBranch;
  if (oldPath && newPath && !newContent) {
    oldContentQuery = `
      oldContent: object(expression: $oldPathWithBranch) {
        ... on Blob {
          oid,
          isBinary,
          text
        }
      }
    `;
    oldPathWithBranch = `${branch}:${oldPath}`;
  }

  // newPathと同名のファイルがあった場合にはエラーにするためのクエリ文字列
  let existsQuery = '';
  let newPathWithBranch;
  if (newPath) {
    existsQuery = `
      existsFile: object(expression: $newPathWithBranch) {
        ... on Blob {
          oid
        }
      }
    `;
    newPathWithBranch = `${branch}:${newPath}`;
  }

  // ブランチのOIDを取得する
  // TODO: OIDはフロント側で管理する 他者によってコミットが進んでいたらどうするか。
  const branchObj = (await graphql(
    `
    query getBranchOid(
      $owner: String!,
      $repo: String!, 
      $qualifiedName: String!, 
      ${oldPathWithBranch?"$oldPathWithBranch: String ,":""}
      ${newPathWithBranch?"$newPathWithBranch: String":""}
    ) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $qualifiedName) {
          target {
            ... on Commit {
              oid
            }
          }
        }
        ${oldContentQuery}
        ${existsQuery}
      }
    }
  `,
    {
      owner,
      repo,
      qualifiedName: `refs/heads/${branch}`,
      oldPathWithBranch,
      newPathWithBranch,
      headers: {
        authorization: `token ${context.token}`,
      },
    },
  )) as any;
  // console.log('branch obj', JSON.stringify(branchObj));

  // 新規ファイルと同名のファイルが存在すればエラー
  if( newPath && branchObj.repository.existsFile !== null ) {
    return {state: false, message: "File already exists"};
  }

  // 既存ファイルの更新
  if(newContent && !newPath) {
    newPath = oldPath;
  }

  // 最新のコミットのObjectID
  const headOid = branchObj.repository.ref.target.oid;
  // 既存ファイルの内容
  if (!newContent && branchObj.repository.oldContent) {
    if (branchObj.repository.oldContent.isBinary) {
      // バイナリデータ
      const octokit = new Octokit({
        auth: `token ${context.token}`,
      });
      const blob = await octokit.git.getBlob({
        owner,
        repo,
        file_sha: branchObj.repository.oldContent.oid,
      });
      newContent = blob.data.content.replaceAll("\n","");
    }else{
      newContent = branchObj.repository.oldContent.text;
      // バイナリデータでない場合は再度Base64エンコードする
      newContent = Buffer.from(newContent, 'utf8').toString('base64');
    }
  }

  // createCommitOnBranchの引数 https://docs.github.com/en/graphql/reference/input-objects#createcommitonbranchinput

  // 新しく作成するファイルのリスト
  const additions = [];
  // console.log(newPath, newContent);
  if (newPath && newContent !== null) { // newContent = ""のこともあるのでnullでないこと
    additions.push({
      path: newPath,
      contents: newContent,
    });
  }

  // 削除するファイルのリスト
  const deletions = [];
  if (removeOldPath && oldPath) {
    deletions.push({path: oldPath});
  }

  if(additions.length == 0 && deletions.length == 0) {
    return {state: false, message: 'no operation'};
  }

  const parameters = {
    repositoryNameWithOwner: `${owner}/${repo}`,
    branch,
    message,
    additions,
    deletions,
    headOid,
    headers: {
      authorization: `token ${context.token}`,
    },
  };

  // console.log(parameters);

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
    parameters
  );
  // console.log('gql result', result);

  // TODO: 更新後のbranchハッシュを返す
  return {state: true, message: 'OK'};
};
