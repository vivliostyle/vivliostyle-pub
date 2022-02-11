import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import {FileState, isEditableFile} from '../frontendFunctions';
import {RepositoryContext, useRepositoryContext} from './useRepositoryContext';
import {AppContext, useAppContext} from './useAppContext';
import {CurrentFile, useCurrentFileContext} from './useCurrentFileContext';
import {transpileMarkdown} from '../previewFunctions';
import {Log, useLogContext} from './useLogContext';
import {VFile} from 'theme-manager';
import {t} from 'i18next';

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
  // パブリック メソッドに相当
  reload: (file: VFile | null) => void;
};

/**
 * useReducer用のAction定義
 */
type Actions =
  | {
      type: 'changeFileCallback';
      file: VFile | null;
      vPubPath: string | null;
      text: string | null;
    }
  | {type: 'reload'; currentFile: CurrentFile | null};

const PreviewSourceContext = createContext({} as PreviewSource);

/**
 * PreviewSourceContextを使用したいコンポーネントで呼び出すこと
 * @returns PreviewSourceContextオブジェクト
 */
export function usePreviewSourceContext() {
  return useContext(PreviewSourceContext);
}

/**
 * MarkDownファイルをHTMLに変換する
 * @param path
 * @param text
 * @returns {path, text}
 */
const transpile = async (
  currentFile: CurrentFile,
  app: AppContext,
  repository: RepositoryContext,
  log: Log,
): Promise<{
  file: VFile | null;
  vPubPath: string | null;
  text: string | null;
} | null> => {
  console.log('[PreviewSourceContext] transpile', currentFile);
  try {
    if (!currentFile.state.file) {
      return null;
    }
    const {
      vPubPath,
      text: resultText,
      errors,
    } = await transpileMarkdown(app, repository, currentFile);
    if (errors.length > 0) {
      log.error(
        t('以下のファイルの処理に失敗しました', {error: errors.join(' , ')}),
      );
    }
    // 準備が終わったら状態を変化させる
    // console.log('call dispatcher', dispatch);
    return {file: currentFile.state.file, vPubPath: vPubPath, text: resultText};
  } catch (err: any) {
    log.error(
      t('プレビュー変換に失敗しました', {
        filepath: currentFile.state.file!.path,
        error: err.message,
      }),
      3000,
    );
    return null;
  }
};

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (state: PreviewSource, action: Actions): PreviewSource => {
  switch (action.type) {
    case 'changeFileCallback': // ドキュメントの準備が完了
      console.log('[PreviewSourceContext] changeFileCallback', action.vPubPath /*, action.text */);
      return {
        ...state,
        path: action.file?.path ?? null,
        vpubPath: action.vPubPath,
        text: action.text,
      };
    case 'reload':
      return {...state};
  }
};

type PreviewSourceProps = {
  children: JSX.Element;
  isAutoReload: boolean;
};

/**
 * PreviewSourceコンテクストコンポーネント
 * @param children 子要素
 * @returns
 */
export const PreviewSourceContextProvider: React.FC<PreviewSourceProps> = ({
  children,
  isAutoReload,
}) => {
  const log = useLogContext();
  const app = useAppContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  console.log('[PreviewSourceContext]' /*currentFile, repository*/);

  /**
   * プレビューを更新
   */
  const updatePreview = useCallback(
    (force: boolean = false) => {
      (async () => {
        if (!(isAutoReload || force)) {
          // console.log('自動更新停止中');
          return;
        }
        if (currentFile.state.file && currentFile.state.text) {
          // console.log('編集対象が変更された', currentFile);
          if (
            currentFile.state.file.name &&
            isEditableFile(currentFile.state.file.name) &&
            (currentFile.state.ext == 'md' || currentFile.state.ext == 'html')
          ) {
            // console.log('編集対象ファイルはプレビュー可能', currentFile);
            const result = await transpile(currentFile, app, repository, log);
            if (result) {
              dispatch({
                type: 'changeFileCallback',
                ...result,
              });
            }
          } else {
            // console.log('編集対象ファイルはプレビュー不可');
          }
        } else {
          // console.log('編集対象が無効', currentFile.state.file, currentFile.state.text);
          dispatch({type: 'changeFileCallback', file:null, vPubPath:null, text:null});
        }
      })();
    },
    [isAutoReload, currentFile, app, repository, log],
  );

  /**
   * 手動リロード 動作しない
   */
  const reload = useCallback((currentFile: CurrentFile | null) => {
    if (currentFile) {
      console.log('[PreviewSourceContext] reload by user action');
      transpile(currentFile, app, repository, log);
      dispatch({type: 'reload', currentFile});
    }
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
    reload,
  } as PreviewSource;

  /**
   * エディタの更新チェック
   */
  useEffect(() => {
    // ファイルを切り替えたときだけプレビューを更新
    // テキストを編集した場合はuseDefferdEffectによる遅延処理を行なう
    if (currentFile.state.state == FileState.init) {
      updatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatePreview]);

  /**
   * 遅延処理
   */
  useDefferedEffect(
    () => {
      if (currentFile.state.state == FileState.modified) {
        updatePreview();
      }
    },
    [currentFile.state.text],
    REFRESH_MS,
  );

  const [previewSource, dispatch] = useReducer(reducer, initialState);

  // console.log('PreviewSourceContext source', previewSource);

  return (
    <PreviewSourceContext.Provider value={previewSource}>
      {children}
    </PreviewSourceContext.Provider>
  );
};
