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
  useMemo,
  useReducer,
} from 'react';
import {FileState, getExt, isEditableFile} from '../frontendFunctions';
import {useAppContext} from './useAppContext';
import {Log, useLogContext} from './useLogContext';
import {RepositoryContext} from './useRepositoryContext';
import {WebApiFs} from '../fs/WebApiFS';
import upath from 'upath';
import {VFile} from 'theme-manager';
import {useCurrentThemeContext} from './useCurrentThemeContext';
import {VPUBFS_ROOT} from '@middlewares/previewFunctions';
import {t} from 'i18next';

type CurrentFileState = {
  file: VFile | null; // ファイル情報
  text: string; // 現在のテキスト
  ext: string; // 拡張子 何箇所かで使うのでここに保持しておく
  state: FileState; // 状態
  timer?: NodeJS.Timeout;
  session: DocumentReference<DocumentData> | null;
  insertBuf: string | null; // 挿入文字列 値がセットされていたらMarkdownEditorでエディタに挿入したあとnullにする
};

/**
 * エディタで編集しているファイル情報
 */
export type CurrentFile = {
  state: CurrentFileState;
  modify: (text: string) => void; // テキスト更新の更新メソッド
  commit: () => void; // ファイルのコミットメソッド
  insert: (str: string | null) => void;
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
  | {type: 'modify'; text: string}
  | {
      type: 'setFile';
      func: (state: CurrentFileState) => boolean; // 状態を変更しないならtrue, busyにするならfalse
    }
  | {
      type: 'setFileCancel';
      state: FileState;
    }
  | {
      type: 'setFileCallback';
      file: VFile | null;
      content: string;
      session: DocumentReference | null;
      state: FileState;
      log: Log;
    }
  | {type: 'commit'; func: (state: CurrentFileState) => void}
  | {type: 'commitCallback'; file: VFile; log: Log}
  | {type: 'insert'; str: string | null};

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (
  state: CurrentFileState,
  action: CurrentFileActions,
): CurrentFileState => {
  switch (action.type) {
    // 内容の編集
    case 'modify':
      console.log('[CurrentFileContextProvider] modify');
      if (state.timer) {
        // タイマーが有効なら一度解除する
        clearTimeout(state.timer);
      }
      const timer = setTimeout(async () => {
        // 編集後2秒間次の編集がされなければfirestoreに編集内容をアップロードする
        await updateDoc(state.session!, {
          userUpdatedAt: serverTimestamp(),
          text: action.text,
        });
        // TODO: ここでstateをsavedにする必要がある
      }, 2000);
      return {...state, state: FileState.modified, text: action.text, timer};

    // 編集対象ファイルを選択
    case 'setFile':
      console.log('[CurrentFileContextProvider] setFile action');
      if (action.func(state)) {
        return state;
      } else {
        return {...state, state: FileState.busy};
      }
    case 'setFileCancel':
      return {...state, state: action.state};
    // ファイルの選択が完了
    case 'setFileCallback':
      console.log(
        '[CurrentFileContextProvider] setFileCallback action',
        action,
      );
      return {
        ...state,
        state: FileState.init,
        file: action.file,
        text: action.content,
        ext: action.file ? getExt(action.file.name) : '',
        session: action.session,
      };

    // ファイルへの変更をGitHubにコミット
    case 'commit':
      action.func(state);
      return state;
    case 'commitCallback':
      action.log.success(
        t('ファイルを保存しました', {filepath: action.file?.path}),
        1000,
      );
      return {...state, state: FileState.clean};
    case 'insert':
      console.log('insert', action.str);
      return {...state, insertBuf: action.str};
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
  repository,
  file,
}: {
  children: JSX.Element;
  repository: RepositoryContext;
  file: VFile | null;
}) {
  // console.log('[CurrentFileContextProvider]', repository, file);
  const app = useAppContext();
  const log = useLogContext();
  const currentTheme = useCurrentThemeContext();

  useEffect(() => {
    console.log('[CurrentFileContextProvider] repository update', repository);
  }, [repository]);

  /**
   * テキストが編集された
   */
  const modify = useCallback((text: string) => {
    dispatch({type: 'modify', text: text});
  }, []);

  /**
   * 編集ファイルの保存
   * TODO: ファイルリストの再読み込み
   */
  const commit = useCallback(() => {
    // console.log('commit action currentTheme', currentTheme, state);
    dispatch({
      type: 'commit',
      func: (state: CurrentFileState) => {
        if (state.file == null || repository.state.branch == null) {
          console.log(
            '[CurrentFileContextProvider] commit cancel',
            state,
            repository,
          );
          return;
        }
        (async (repository: RepositoryContext) => {
          // カスタムテーマが選択されている場合、CSSのパスを取得する
          let style;
          if (currentTheme.state.theme?.name === 'vivliostyle-custom-theme') {
            // TODO: 以下のパスの処理を整理する
            const docPath = state.file?.dirname! ?? '/';
            const stylePath = currentTheme.state.stylePath
              ? upath.relative(VPUBFS_ROOT, currentTheme.state.stylePath)
              : undefined;
            style = stylePath ? upath.relative(docPath, stylePath) : undefined;
          }
          try {
            // firestoreの内容を更新する
            await updateDoc(state.session!, {
              userUpdatedAt: serverTimestamp(),
              text: state.text,
            });
            // Web APIを呼び出すためのアクセストークンを取得する
            const idToken = await app.state.user!.getIdToken();
            let sessionId = state.session?.id;
            // コミットAPIの呼び出し
            console.log(
              '[CurrentFileContextProvider] commit to repository',
              repository,
            );
            const response = await fetch('/api/github/commitSession', {
              method: 'PUT',
              body: JSON.stringify({
                sessionId: sessionId,
                branch: repository.state.branch,
                style: style,
              }),
              headers: {
                'content-type': 'application/json',
                'x-id-token': idToken,
              },
            });
            console.log(
              '[CurrentFileContextProvider] commit session response',
              response,
            );
            if (response.status == 201) {
              dispatch({type: 'commitCallback', file: state.file!, log});
            } else {
              // TODO: ステータスコードに応じたエラーメッセージを出力
              throw new Error(`status code ${response.status}`);
            }
          } catch (err: any) {
            log.error(
              t('ファイルの保存に失敗しました', {
                filepath: state.file?.path,
                error: err.message,
              }),
              1000,
            );
          }
        })(repository);
      },
    });
  }, [app.state.user, currentTheme, log, repository]);

  useEffect(() => {
    // 上位コンポーネントから渡されたfileが更新された
    console.log('[CurrentFileContextProvider] changed file', repository, file);
    if (
      !repository?.state.owner ||
      !repository?.state.repo ||
      !repository?.state.branch
    ) {
      console.log('[CurrentFileContextProvider] cancel');
      return;
    }
    dispatch({
      type: 'setFile',
      func: (state: CurrentFileState): boolean => {
        console.log('[CurrentFileContextProvider] change file2', file, state);
        if (file?.path === state.file?.path) {
          return true;
        }
        // 現在編集しているファイルが未保存の状態で別のファイルが選択されたなら警告する
        if (
          file?.path !== state.file?.path &&
          (state.state == FileState.modified || state.state == FileState.saved)
        ) {
          if (
            !confirm(t('ファイルが保存されていません。変更を破棄しますか?'))
          ) {
            // ファイルの切り替えをキャンセル
            dispatch({type: 'setFileCancel', state: state.state});
            return true;
          }
        }
        if (!file) {
          // ファイル未選択なら選択解除
          dispatch({
            type: 'setFileCallback',
            file: null,
            content: '',
            session: null,
            state: FileState.none,
            log,
          });
          return true;
        }
        if (!isEditableFile(file.path)) {
          // エディタで編集不可能なファイル
          // 画像ファイルはProjectExplorerの段階でライトボックス表示しているのでここまでこない
          log.error(
            t('編集できないファイル形式です', {filepath: file.path}),
            3000,
          );
          repository.selectFile(null);
          dispatch({type: 'setFileCancel', state: state.state});
          return true;
        }
        (async (repository: RepositoryContext) => {
          try {
            const props = {
              user: app.state.user!,
              owner: repository.state.owner!,
              repo: repository.state.repo!,
              branch: repository.state.branch!,
            };
            console.log('[CurrentFileContextProvider] setFile props', props);
            const fs = await WebApiFs.open(props);
            const content = await fs.readFile(file.path);
            if (content == undefined || content == null) {
              // 0バイトのファイルがあるため、!contentでは駄目
              log.error(
                t('ファイルの取得が出来ませんでした', {filepath: file.path}),
                3000,
              );
              repository.selectFile(null);
              dispatch({type: 'setFileCancel', state: state.state});
              return;
            }
            const session = await fs.getFileSession(file.path);
            // クエリパラメータにファイル名を設定
            setQueryParam(file);
            log.info(t('ファイルを選択しました', {filepath: file.path}));
            dispatch({
              type: 'setFileCallback',
              file: file,
              content: content.toString(),
              session,
              state: FileState.init,
              log,
            });
          } catch (err: any) {
            log.error(
              t('セッション情報が取得できませんでした', {filepath: file.path}),
              3000,
            );
            console.error(err);
            dispatch({type: 'setFileCancel', state: state.state});
          }
        })(repository);
        return false;
      },
    });
  }, [repository, file, log, app.state.user]);

  /**
   * 初期値
   */
  const initialState = {
    // 状態
    state: FileState.none,
    session: null,
    insertBuf: null,
  } as CurrentFileState;

  const [state, dispatch] = useReducer(reducer, initialState);

  const insert = useCallback((str: string | null) => {
    console.log('insert', str);
    dispatch({type: 'insert', str});
  }, []);

  const value = useMemo(
    () => ({
      state,
      // メソッド
      modify,
      commit,
      insert,
    }),
    [state, commit, modify, insert],
  );

  return (
    <CurrentFileContext.Provider value={value}>
      {children}
    </CurrentFileContext.Provider>
  );

  /**
   * クエリパラメータのfile属性にファイルパスをセットする
   * @param file
   */
  function setQueryParam(file: VFile | null) {
    const url = new URL(window.location.toString());
    if (file) {
      url.searchParams.set('file', file.path);
    } else {
      url.searchParams.delete('file');
    }
    history.pushState({}, '', url);
  }
}
