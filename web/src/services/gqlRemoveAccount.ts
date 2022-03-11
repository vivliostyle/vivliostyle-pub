import {queryContext} from './gqlAuthDirective';
import firebaseAdmin from './firebaseAdmin';

/**
 * firebaseのアカウントを削除する
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
export const removeAccount = async (
  parent: any,
  args: any,
  context: queryContext,
  info: any,
) => {
  // console.log('createRef', parent, args, context, info);

  if (!context.token || !context.uid) {
    // Userのトークンが無ければ失敗
    // TODO: エラー処理
    return {state: false, message: 'ユーザトークンが異常です'};
  }

  try {
    await firebaseAdmin
      .firestore()
      .collection('users')
      .doc(context.uid)
      .delete();
    firebaseAdmin.auth().deleteUser(context.uid);
  } catch (e) {
    return {state: false, message: 'ユーザの削除に失敗しました'};
  }

  // firebaseのアカウントを削除する
  return {state: true, message: '削除成功'};
};
