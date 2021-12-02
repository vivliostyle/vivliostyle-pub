import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import {DocumentData, DocumentReference} from 'firebase/firestore';
import {FileState, isEditableFile} from '../frontendFunctions';
import {useRepositoryContext} from './useRepositoryContext';
import {useAppContext} from './useAppContext';
import {useCurrentFileContext} from './useCurrentFileContext';
import {
  transpileMarkdown,
} from '../previewFunctions';
import {useLogContext} from './useLogContext';

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
  changeFile: (path: string | null, text: string | null) => void;
  commit: (
    session: DocumentReference<DocumentData> | undefined,
    branch: string | undefined,
  ) => void;
  reload: (filePath:string,text:string) => void;
};

type Actions =
  | {
      type: 'changeFileCallback';
      path: string | null;
      vPubPath: string | null;
      text: string | null;
    }
  | {type: 'reload'; path:string; text:string; }
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

  // useEffect(() => {
  // console.log('modifiedText', currentFile.text);
  // }, [currentFile.text]);

  console.log('[PreviewSourceContext]' /*currentFile, repository*/);
  /**
   * ファイルをリポジトリにコミットする
   * @param session
   * @param branch
   */
  const commit = useCallback(
    (
      session: DocumentReference<DocumentData> | undefined,
      branch: string | undefined,
    ) => {},
    [],
  );
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
   * MarkDownファイルをHTMLに変換する
   * @param path
   * @param text
   * @returns {path, text}
   */
  const transpile = useCallback(
    (srcPath: string, text: string): void => {
      (async () => {
        try {
          const {vPubPath, text: resultText} = await transpileMarkdown(
            app,
            repository,
            srcPath,
            text,
          );
          // 準備が終わったら状態を変化させる
          // console.log('call dispatcher', dispatch);
          dispatch({
            type: 'changeFileCallback',
            path: srcPath,
            vPubPath: vPubPath,
            text: resultText,
          });
        } catch (err: any) {
          log.error(
            'プレビュー変換に失敗しました(' + srcPath + ') ： ' + err.message,
            3000,
          );
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, repository],
  );

  /**
   * プレビューを更新
   */
  const updatePreview = useCallback((force:boolean=false) => {
    if(!(isAutoReload || force)){ 
      console.log('自動更新停止中');
      return;
    }
    if (currentFile.file && currentFile.text) {
      console.log('編集対象が変更された', currentFile);
      if (
        currentFile.file.name &&
        isEditableFile(currentFile.file.name) &&
        (currentFile.ext == 'md' || currentFile.ext == 'html')
      ) {
        console.log('編集対象ファイルはプレビュー可能');
        transpile(currentFile.file.name, currentFile.text);
      } else {
        console.log('編集対象ファイルはプレビュー不可');
      }
    } else {
      console.log('編集対象が無効', currentFile.file, currentFile.text);
    }
  },[currentFile, isAutoReload, transpile]);

  /**
   * 手動リロード 動作しない
   */
  const reload = useCallback((filePath:string,text:string)=>{
    console.log('reload by user action');
    dispatch({type:'reload', path:filePath, text:text});
    //updatePreview(true); // 古いupdatePreviewを呼び出すと、クロージャ内のテキストを使ってしまうのでuseCallback不可
  },[]);

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
    commit: commit,
    reload,
  } as PreviewSource;

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
  }, [updatePreview]);

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

  /**
   * 処理のディスパッチ
   * @param state
   * @param action
   * @returns
   */
  const reducer = useCallback(
    (state: PreviewSource, action: Actions): PreviewSource => {
      switch (action.type) {
        case 'changeFileCallback': // ドキュメントの準備が完了
          console.log('changeFileCallback', action.vPubPath /*, action.text */);
          return {
            ...state,
            path: action.path,
            vpubPath: action.vPubPath,
            text: action.text,
          };
        case 'reload':
          transpile(action.path, action.text);
          return {...state};
        case 'commit': // コミット
          commit(action.session!, action.branch);
          return state;
      }
    },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [app],
  );

  const [previewSource, dispatch] = useReducer(reducer, initialState);

  // console.log('PreviewSourceContext source', previewSource);

  return (
    <PreviewSourceContext.Provider value={previewSource}>
      {children}
    </PreviewSourceContext.Provider>
  );
};
