import {Octokit} from '@octokit/rest';
import {graphql} from '@octokit/graphql';

import {queryContext} from './gqlAuthDirective';
import {createAppAuth} from '@octokit/auth-app';
import {githubAppPrivateKey} from '@utils/keys';
import {ApolloError} from 'apollo-server-micro';
import * as admin from 'firebase-admin';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseAdmin from './firebaseAdmin';

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
  if (!installation) {
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

  return {
    graphqlWithAuth,
    owner: args.owner,
    name: args.name,
    insId: installationId,
  };
};

/**
 * リポジトリ内のオブジェクト(Blob|Tree)を返す
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
) => {
  // console.log("getRepositoryObject",'parent:', parent ,"\nargs:", args,"\ncontext", context /*,"\ninfo:", info*/);

  // repository > object という階層構造
  // repository{ } で選択されているフィールド
  const repositorySelections = info.fieldNodes[0].selectionSet.selections;
  // repository{ object{ } } で選択されているフィールド
  const objectSelections = repositorySelections[1].selectionSet.selections;
  // クエリで選択されているフィールド名のリスト
  const fieldNames = objectSelections.map((f: any) => f.name.value);

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
    if (result.repository.object.isBinary) {
      // GitHubのGraphQL APIではisBinaryがtrueのときは
      // textプロパティは空なので、REST APIを使ってバイナリデータを取得してtextプロパティにセットする
      // const octokit = new Octokit({
      //   appId: process.env.GH_APP_ID,
      //   privateKey: githubAppPrivateKey,
      //   installationId: parent.insId,
      // });
      // GitHub Appの権限ではプライベートリポジトリのBlob APIで404エラーになってしまうため、
      // ユーザーアカウントでアクセスする。
      const octokit = new Octokit({
        auth: `token ${context.token}`,
      });
      const blob = await octokit.git.getBlob({
        owner: parent.owner,
        repo: parent.name,
        file_sha: result.repository.object.oid,
      });
      // throw new Error(JSON.stringify(blob));
      if (blob.data.content) {
        const content = blob.data.content; //.replaceAll('\n', '');
        result.repository.object.text = content;
      }
    }

    // BlobかつsessiodIdが要求されている場合のみFirestoreに内容を保存する
    if (
      result.repository.object.__typename === 'Blob' &&
      fieldNames.includes('sessionId')
    ) {
      // create session
      const db = firebaseAdmin.firestore();

      // TODO: branchも保存すべきでは
      const data = {
        userUpdatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        text: result.repository.object.text,
        owner: parent.owner,
        repo: parent.name,
        path: args.expression,
      };
      // 権限については /firestore/firestore.rules を参照
      const sessionDoc = await db
        .collection('users')
        .doc(context.uid!)
        .collection('sessions')
        .add(data);
      result.repository.object.sessionId = sessionDoc.id;
    }
    return result.repository.object;
  } catch (err: any) {
    console.error(err);
    throw new ApolloError(err.message);
  }
};
