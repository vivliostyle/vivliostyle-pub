import { DocumentReference } from 'firebase/firestore';
import { Dirent } from 'fs-extra';
import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { FileState, getExt, isEditableFile } from './frontendFunctions';
import { useAppContext } from './useAppContext';
import { useLogContext } from './useLogContext';
import { useRepositoryContext } from './useRepositoryContext';
import { WebApiFs } from './WebApiFS';

/**
 * エディタで編集しているファイル情報
 */
 export type CurrentFile = {
  file: Dirent | null;            // ファイル情報
  text: string;                   // 現在のテキスト 
  ext: string;                    // 拡張子
  state: FileState;               // 状態
  session?: DocumentReference;    // firestoreのセッションID
  modify: (text: string) => void; // テキスト更新の更新メソッド
  commit: () => void;             // ファイルのコミットメソッド
};

const CurrentFileContext = createContext({} as CurrentFile);

export function useCurrentFileContext() {
  return useContext(CurrentFileContext);
}

type CurrentFileActions =
| { type: 'modify'; text: string; }
| { type: 'setFile'; file: Dirent | null; }
| { type: 'setFileCallback'; seq:number; file: Dirent | null; content:string}
| { type: 'commit'};

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
  onReady
}: {
  children: JSX.Element;
  file: Dirent | null;
  onReady: (file:Dirent|null)=>void;
}) {
  console.log('[CurrentFileContextProvider]'/*, file, onReady*/);
  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();

  /**
   * テキストが編集された
   */
  const modify = useCallback((text: string) => {
    dispatch({type: 'modify', text: text});
  }, []);

  const commit = useCallback(() => {
    dispatch({type:"commit"});
  }, []);

  useEffect(()=>{
    console.log('call setFileDispatch',file);
    dispatch({type:'setFile',file:file});
  },[file]);

  /**
   * 初期値
   */
  const initialState = {
    state: FileState.none,
    modify,
    commit,
  } as CurrentFile;

  let seq = 0;

  const reducer = useCallback(
    (state: CurrentFile, action: CurrentFileActions): CurrentFile => {
      switch (action.type) {
        case 'modify': // 内容の編集
          return {...state, state: FileState.modified, text:action.text};
        case 'setFile':
          console.log('setFile',action);
          // 同じファイルを選択した場合何もしない
          // ファイルの切り替えの際にはコミットされている前提
          if ((action.file == null && state.file == null)
             || action.file?.name === state.file?.name
          ) {
            return state;
          }
          if (!action.file) {
            // 選択解除
            onReady(null);
            return {...state, file: null, state:FileState.none};
          }
          if(action.file) {log.info('ファイルが選択されました : '+action.file?.name)};
          if (!isEditableFile(action.file.name)) {
            // 画像などのエディタで編集不可能なファイル
            // TODO: 画像ビューワー
            log.error('編集できないファイル形式です : ' + action.file.name, 3000);
            onReady(action.file);
            return {...state, state: FileState.none};
          }
          WebApiFs.open({
            user: app.user!,
            owner: repository.owner!,
            repo: repository.repo!,
            branch: repository.branch!,
          }).then((fs)=>{
            fs.readFile(action.file?.name!)
            .then((content)=>{
              // console.log('dispatch setFileCallback', seq,action.file,content);
              if(!content) {
                log.error('ファイルの取得が出来ませんでした(' + action.file?.name + ') : '+content, 3000);
                return state;
              }
              dispatch({type: 'setFileCallback', seq, file:action.file, content:content.toString() });
            })
          }).catch((err)=>{
            log.error('ファイルの取得が出来ませんでした(' + action.file?.name + ') : ' + err.message, 3000);
            console.error(err);
            onReady(action.file);
          });
          return {...state,state:FileState.none};
        case 'setFileCallback':
          console.log('setFileCallback',action);
          // 多重処理をキャンセル
          if (action.seq != seq) {
            console.log('dispatch cancel');
            return state;
          } else {
            seq++;
          }
          if (action.file) {
            // ファイル情報が取得できたら対象ファイルを変更してstateをinitにする
        //     // if (action.file.session) {
        //     //   // setSession(file.session);
        //     // }
        //     // previewSource.changeFile(path, file.text);
            onReady(action.file);
            return {...state, state:FileState.init, file: action.file, text: action.content, ext: getExt(action.file.name) /*action.file.file*/};
          } else {
            // ファイル情報が取得できなかった
            console.error('file not found');
            onReady(action.file);
            return {...state, state:FileState.none, file: null };
          }
        case 'commit':
          return { ...state, state:FileState.clean };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app,repository],
  );
  const [context, dispatch] = useReducer(reducer, initialState);

  return (
    <CurrentFileContext.Provider value={context}>
      {children}
    </CurrentFileContext.Provider>
  );
}
