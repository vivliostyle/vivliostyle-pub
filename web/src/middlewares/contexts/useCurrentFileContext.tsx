import {
  DocumentReference,
  updateDoc,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {FileState, getExt, isEditableFile} from '../frontendFunctions';
import {useAppContext} from './useAppContext';
import {Log, useLogContext} from './useLogContext';
import {useRepositoryContext} from './useRepositoryContext';
import {WebApiFs} from '../fs/WebApiFS';
import upath from 'upath';
import {VFile} from 'theme-manager';
import {useCurrentThemeContext} from './useCurrentThemeContext';
import {VPUBFS_ROOT} from '@middlewares/previewFunctions';
import {t} from 'i18next';

/**
 * エディタで編集しているファイル情報
 */
export type CurrentFile = {
  file: VFile | null; // ファイル情報
  text: string; // 現在のテキスト
  ext: string; // 拡張子 何箇所かで使うのでここに保持しておく
  state: FileState; // 状態
  timer?: NodeJS.Timeout;
  modify: (text: string) => void; // テキスト更新の更新メソッド
  commit: () => void; // ファイルのコミットメソッド
};

/**
 * React Context
 */
const CurrentFileContext = createContext({} as CurrentFile);

export function useCurrentFileContext() {
  return useContext(CurrentFileContext);
}

/**
 * useReducer用のAction定義
 */
type CurrentFileActions =
  | {type: 'modify'; text: string; session: DocumentReference}
  | {
      type: 'setFileCallback';
      file: VFile | null;
      content: string;
      session: DocumentReference | null;
      state: FileState;
      _log: Log;
    }
  | {type: 'commitCallback'};

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (
  state: CurrentFile,
  action: CurrentFileActions,
): CurrentFile => {
  switch (action.type) {
    // 内容の編集
    case 'modify':
      // console.log('modify');
      if (state.timer) {
        // タイマーが有効なら一度解除する
        clearTimeout(state.timer);
      }
      const timer = setTimeout(() => {
        // 編集後2秒間次の編集がされなければfirestoreに編集内容をアップロードする
        updateDoc(action.session!, {
          userUpdatedAt: serverTimestamp(),
          text: action.text,
        }).then(() => {});
      }, 2000);
      return {...state, state: FileState.modified, text: action.text, timer};

    // ファイルの選択が完了
    case 'setFileCallback':
      // console.log('setFileCallback', action);
      return {
        ...state,
        state: FileState.init,
        file: action.file,
        text: action.content,
        ext: action.file ? getExt(action.file.name) : '',
      };

    // ファイル保存が完了
    case 'commitCallback':
      return {...state, state: FileState.clean};
  }
};

/**
 * テキスト編集ごとにかかる更新範囲を限定するため、
 * 現在編集中のテキストを独立して管理する
 * RepositoryContextProviderの子として配置すること
 * @param param0
 * @returns
 */
export function CurrentFileContextProvider({
  children,
  file,
}: {
  children: JSX.Element;
  file: VFile | null;
}) {
  console.log('[CurrentFileContextProvider]' /*, file, onReady*/);
  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();
  const currentTheme = useCurrentThemeContext();

  const [state, setState] = useState<FileState>(FileState.none);
  // firestoreのsessionId commitSession APIを利用するために必要
  const [session, setSession] =
    useState<DocumentReference<DocumentData> | null>(null);

  /**
   * テキストが編集された
   */
  const modify = useCallback((text: string) => {
    setSession((pre) => {
      // preにはレンダリング前でも最新の値が入っている
      if (pre) {
        dispatch({type: 'modify', text: text, session: pre});
      }
      return pre;
    });
  }, []);

  /**
   * 編集ファイルの保存
   * TODO: ファイルリストの再読み込み
   */
  const commit = () => {
    // console.log('commit action currentTheme', currentTheme, state);
    (async () => {
      // カスタムテーマが選択されている場合、CSSのパスを取得する
      let style;
      if (currentTheme.theme?.name === 'vivliostyle-custom-theme') {
        // TODO: 以下のパスの処理を整理する
        const docPath = file?.dirname!;
        const stylePath = currentTheme.stylePath
          ? upath.relative(VPUBFS_ROOT, currentTheme.stylePath)
          : undefined;
        style = stylePath ? upath.relative(docPath, stylePath) : undefined;
      }

      try {
        // Web APIを呼び出すためのアクセストークンを取得する
        const idToken = await app.user!.getIdToken();
        let sessionId;
        setSession((pre) => {
          // preにはレンダリング前でも最新の値が入っている
          sessionId = pre?.id;
          return pre;
        });
        // コミットAPIの呼び出し
        const response = await fetch('/api/github/commitSession', {
          method: 'PUT',
          body: JSON.stringify({
            sessionId: sessionId,
            branch: repository.branch,
            style: style,
          }),
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        });
        if (response.status == 201) {
          log.success(
            t('ファイルを保存しました', {filepath: file?.path}),
            1000,
          );
          dispatch({type: 'commitCallback'});
        } else {
          // TODO: ステータスコードに応じたエラーメッセージを出力
          log.error(
            t('ファイルの保存に失敗しました', {
              filepath: file?.path,
              error: `status code ${response.status}`,
            }),
            1000,
          );
        }
      } catch (err: any) {
        log.error(
          t('ファイルの保存に失敗しました', {
            filepath: file?.path,
            error: err.message,
          }),
          1000,
        );
      }
    })();
  };

  useEffect(() => {
    if(!repository.owner || !repository.repo || !repository.branch) { return; }
    // 上位コンポーネントから渡されたfileが更新された
    (async () => {
      if (state == FileState.modified || state == FileState.saved) {
        if (!confirm(t('ファイルを保存していません。変更を破棄しますか?'))) {
          // ファイルの切り替えをキャンセル
          return;
        }
      }
      // 同じファイルを選択した場合何もしない
      // const newFilePath = file?.path;
      // const pastFilePath = state.file
      //   ? upath.join(state.file?.dirname, state.file?.name)
      //   : '';
      // if (
      //   (action.file == null && state.file == null) ||
      //   newFilePath === pastFilePath
      // ) {
      //   if (isEditableFile(action.file?.name)) {
      //     // 同じファイルを選択していても編集可能ファイルならスピナーを解除する
      //     onReady(action.file);
      //     return {...state, state: FileState.init};
      //   }
      //   return state;
      // }
      if (!file) {
        // ファイル未選択なら選択解除
        setState(FileState.none);
        dispatch({
          type: 'setFileCallback',
          file: null,
          content: '',
          session: null,
          state: FileState.none,
          _log: log,
        });
        return;
      }
      // console.log('setFile filePath', file.path);
      if (!isEditableFile(file.path)) {
        // エディタで編集不可能なファイル
        // 画像ファイルはProjectExplorerの段階でライトボックス表示しているのでここまでこない
        log.error(
          t('編集できないファイル形式です', {filepath: file.path}),
          3000,
        );
        return;
      }
      try {
        const props = {
          user: app.user!,
          owner: repository.owner!,
          repo: repository.repo!,
          branch: repository.branch!,
        };
        console.log('setFile props', props);
        const fs = await WebApiFs.open(props);
        const content = await fs.readFile(file.path);
        if (content == undefined || content == null) {
          // 0バイトのファイルがあるため、!contentでは駄目
          log.error(
            t('ファイルの取得が出来ませんでした', {filepath: file.path}),
            3000,
          );
          return state;
        }
        const session = await fs.getFileSession(file.path);
        // クエリパラメータにファイル名を設定
        setQueryParam(file);
        log.info(t('ファイルを選択しました', {filepath: file.path}));
        setSession(session);
        dispatch({
          type: 'setFileCallback',
          file: file,
          content: content.toString(),
          session,
          state: FileState.init,
          _log: log,
        });
      } catch (err: any) {
        log.error(
          t('セッション情報が取得できませんでした', {filepath: file.path}),
          3000,
        );
        console.error(err);
      }
    })();
  }, [app, repository, file]);

  /**
   * 初期値
   */
  const initialState = {
    // 状態
    state,
    // メソッド
    modify,
    commit,
  } as CurrentFile;

  const [context, dispatch] = useReducer(reducer, initialState);

  return (
    <CurrentFileContext.Provider value={context}>
      {children}
    </CurrentFileContext.Provider>
  );

  /**
   * クエリパラメータのfile属性にファイルパスをセットする
   * @param file
   */
  function setQueryParam(file: VFile) {
    const url = new URL(window.location.toString());
    if (file) {
      url.searchParams.set('file', file.path);
    } else {
      url.searchParams.delete('file');
    }
    history.pushState({}, '', url);
  }
}
