import {
  createContext,
  useState,
  useContext,
  useReducer,
  Dispatch,
  useEffect,
  useCallback,
} from 'react';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {parse} from 'scss-parser';
import {
  FileState,
  getFileContentFromGithub,
  isEditableFile,
  updateCache,
  updateCacheFromPath,
} from './frontendFunctions';
import {useRepositoryContext} from './useRepositoryContext';
import path from 'path';
import {useAppContext} from './useAppContext';
import {Theme} from 'theme-manager';
import {useCurrentFileContext} from './useCurrentFileContext';
import {
  pickupCSSResources,
  processTheme,
  transpileMarkdown,
  VPUBFS_ROOT,
} from './previewFunctions';
import {useLogContext} from './useLogContext';

/**
 * URLか判定
 * @param value
 * @returns
 */
const isURL = (value: string) => /^http(?:s)?:\/\//g.test(value);

/**
 * 遅延処理
 */
const REFRESH_MS = 2000;
function useDefferedEffect(
  fn: () => void,
  args: React.DependencyList,
  duration: number,
) {
  useEffect(() => {
    const timer = setTimeout(() => fn(), duration);
    return () => {
      clearTimeout(timer);
    };
  }, args);
}

/**
 * モデルクラスのインターフェースに相当
 */
export type PreviewSource = {
  // Read Onlyプロパティに相当
  path: string | null;
  vpubPath: string | null; // viewer.jsのx= に渡すパス
  text: string | null;
  theme: string | null;
  stylePath: string | null; // viewer.jsのstyle= に渡すパス
  // パブリック メソッドに相当
  changeFile: (path: string | null, text: string | null) => void;
  changeTheme: (text: Theme | null) => void;
  modifyText: (text: string | null) => void;
  commit: (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => void;
};

type Actions =
  | {
      type: 'changeFileCallback';
      path: string | null;
      vPubPath: string | null;
      text: string | null;
    }
  | {type: 'changeThemeCallback'; theme: string | null}
  | {type: 'modifyText'; text: string | null}
  | {
      type: 'commit';
      session: DocumentReference | undefined;
      branch: string | undefined;
    };

const PreviewSourceContext = createContext({} as PreviewSource);

/**
 * PreviewSourceContextを使用したいコンポーネントで呼び出すこと
 * @returns PreviewSourceContextオブジェクト
 */
export function usePreviewSourceContext() {
  return useContext(PreviewSourceContext);
}

/**
 * PreviewSourceコンテクストコンポーネント
 * @param children 子要素
 * @returns
 */
export function PreviewSourceContextProvider({
  children,
}: {
  children: JSX.Element;
}) {
  let dispatcher: Dispatch<Actions> | undefined;
  const log = useLogContext();
  const app = useAppContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  useEffect(() => {
    console.log('modifiedText', currentFile.text);
  }, [currentFile.text]);

  console.log('[PreviewSourceContext]', currentFile);
  /**
   * ファイルをリポジトリにコミットする
   * @param session
   * @param branch
   */
  const commit = async (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => {};
  /**
   * 対象となるファイルを切り替える
   * @param path
   * @param text
   */
  const changeFile = (filePath: string | null, text: string | null) => {
    // TODO: ファイル未選択や空ファイルへの対応
    transpile(filePath!, text!);
  };
  /**
   * 対象となるテーマを切り替える
   * TODO: CSS単体ファイルだけではなく、テーマオブジェクトを扱えるようにする。
   * @param theme
   */
  const changeTheme = (theme: Theme | null) => {
    console.log('changeTheme', theme, app.user);
    if (theme) {
      processTheme(app, repository, theme.files[0])
        .then((themePath) => {
          // 準備が終わったら状態を変化させる
          if (dispatcher) {
            dispatcher({type: 'changeThemeCallback', theme: themePath});
          }
        })
        .catch((err) => {
          log.error(
            `テーマの準備に失敗しました(${theme.style}) : ${err.message}`,
            3000
          );
        });
    } else {
      // TODO: テーマのリセット
    }
  };

  const updatePreview = () => {
    if (currentFile.file && currentFile.text) {
      console.log('onUpdate');
      console.log('編集対象が変更された', currentFile);
      if (
        currentFile.file.path &&
        isEditableFile(currentFile.file.path) &&
        (currentFile.ext == 'md' || currentFile.ext == 'html')
      ) {
        console.log('編集対象ファイルはプレビュー可能');
        transpile(currentFile.file.path, currentFile.text);
      } else {
        console.log('編集対象ファイルはプレビュー不可');
      }
    }
  };

  /**
   * テキストを更新する
   * @param text
   */
  const modifyText = useCallback((text: string | null) => {
    // console.log('preview modifyText', text);
    // dispatch({type: 'modifyText', text});
  }, []);

  /**
   * 初期値
   */
  const initialState = {
    // properties
    path: null,
    vpubPath: null,
    text: null,
    theme: null,
    stylePath: null,
    // methods
    changeFile,
    changeTheme,
    modifyText,
    commit: commit,
  } as PreviewSource;

  /**
   * MarkDownファイルをHTMLに変換する
   * @param path
   * @param text
   * @returns {path, text}
   */
  const transpile = useCallback(
    (srcPath: string, text: string): void => {
      (async () => {
        await transpileMarkdown(app, repository, srcPath, text)
          .then(({vPubPath, text}) => {
            // 準備が終わったら状態を変化させる
            console.log('call dispatcher', dispatch);
            dispatch({
              type: 'changeFileCallback',
              path: srcPath,
              vPubPath: vPubPath,
              text: text,
            });
          })
          .catch((err) => {
            log.error(
              'プレビュー変換に失敗しました(' + srcPath + ') ： ' + err.message, 
              3000
            );
          });
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, repository],
  );

  /**
   * エディタの更新チェック
   */
  useEffect(() => {
    // ファイルを切り替えたときだけプレビューを更新
    // テキストを編集した場合はuseDefferdEffectによる遅延処理を行なう
    if (currentFile.state == FileState.init) {
      updatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile]);

  /**
   * 遅延処理
   */
  useDefferedEffect(
    () => {
      if (currentFile.state == FileState.modified) {
        updatePreview();
      }
    },
    [currentFile.text],
    REFRESH_MS,
  );

  const fetchTheme = () => {
    const VPUBFS_CACHE_NAME = 'vpubfs';
    const VPUBFS_ROOT = '/vpubfs';
    (async () => {
      // const cache = await caches.open(VPUBFS_CACHE_NAME);
      // const file: File = new File([theme.files[theme.style]], theme.style);
      // const headers = new Headers();
      // headers.append('content-type', 'text/css');
      // const stylesheetPath = `${theme.name}/${theme.style}`;
      // const vpubfsPath = `${VPUBFS_ROOT}/${stylesheetPath}`;
      // await cache.delete(new Request(vpubfsPath));
      // await cache.put(
      //   vpubfsPath,
      //   new Response(theme.files[theme.style], {headers}),
      // );
      // previewSource.changeTheme(stylesheetPath);
      // setStylesheet(stylesheetPath);
    })();
  };

  /**
   * 処理のディスパッチ
   * @param state
   * @param action
   * @returns
   */
  const reducer = (state: PreviewSource, action: Actions): PreviewSource => {
    switch (action.type) {
      case 'changeFileCallback': // ドキュメントの準備が完了
        console.log('changeFileCallback', action.vPubPath, action.text);
        return {
          ...state,
          path: action.path,
          vpubPath: action.vPubPath,
          text: action.text,
        };
      case 'changeThemeCallback': // テーマの準備が完了
        console.log('changeThemeCallback', action.theme);
        let stylePath: string = '';
        if (action.theme) {
          stylePath = isURL(action.theme)
            ? action.theme
            : path.join(VPUBFS_ROOT, action.theme);
        }
        return {...state, theme: action.theme!, stylePath};
      case 'modifyText': // テキストが変更された
        console.log('modified');
        transpileMarkdown(app, repository, state.path!, action.text!)
          .then(({vPubPath, text}) => {
            // 準備が終わったら状態を変化させる
            console.log('call dispatcher', dispatch, text);
            dispatch({
              type: 'changeFileCallback',
              path: state.path,
              vPubPath: vPubPath,
              text: text,
            });
          })
          .catch((err) => {
            log.error(
              'プレビュー変換に失敗しました(' +
                state.path +
                ') ： ' +
                err.message,
                3000
            );
          });
        return {...state, text: action.text};
      case 'commit': // コミット
        commit(action.session!, action.branch);
        return state;
    }
  };

  const [previewSource, dispatch] = useReducer(reducer, initialState);

  console.log('PreviewSourceContext source', previewSource);

  return (
    <PreviewSourceContext.Provider value={previewSource}>
      {children}
    </PreviewSourceContext.Provider>
  );
}
