import {queryContext} from './gqlAuthDirective';
import {graphql} from '@octokit/graphql';
import {Octokit} from '@octokit/rest';

/**
 * ブランチを作成する
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const createRef = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
  // console.log('createRef', parent, args, context, info);

  if (!context.token) {
    // Userのトークンが無ければ失敗
    // TODO: エラー処理
    return {state: false, message: 'ユーザトークンが異常です'};
  }

  const params = args.input;
  // 必須項目
  const name = params.name; // 新しいブランチ名
  const oid = params.oid; // ブランチの最新コミットのID
  const repositoryId = params.repositoryId; // リポジトリのID

  const parameters = {
    name,
    oid,
    repositoryId,
    headers: {
      authorization: `token ${context.token}`,
    },
  };
  console.log('createRef parameters', parameters, '\nargs', args);

  const result = await graphql(
    `
      mutation createRef(
        $name: String!
        $oid: GitObjectID!
        $repositoryId: ID!
      ) {
        createRef(
          input: {name: $name, oid: $oid, repositoryId: $repositoryId}
        ) {
          clientMutationId
          # ref
        }
      }
    `,
    parameters,
  );
  console.log('createRef result', result);

  // TODO: 更新後のbranchハッシュを返す
  return result;
};
