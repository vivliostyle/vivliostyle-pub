import {DocumentReference, updateDoc, serverTimestamp} from 'firebase/firestore';
import {Dirent} from 'fs-extra';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {FileState, getExt, isEditableFile} from './frontendFunctions';
import {useAppContext} from './useAppContext';
import {useLogContext} from './useLogContext';
import {useRepositoryContext} from './useRepositoryContext';
import {WebApiFs} from './WebApiFS';
import upath from 'upath';

/**
 * エディタで編集しているファイル情報
 */
export type CurrentFile = {
  file: Dirent | null; // ファイル情報
  text: string; // 現在のテキスト
  ext: string; // 拡張子
  state: FileState; // 状態
  session?: DocumentReference; // firestoreのセッションID
  modify: (text: string) => void; // テキスト更新の更新メソッド
  commit: () => void; // ファイルのコミットメソッド
  timer?: NodeJS.Timeout;
};

const CurrentFileContext = createContext({} as CurrentFile);

export function useCurrentFileContext() {
  return useContext(CurrentFileContext);
}

type CurrentFileActions =
  | {type: 'modify'; text: string}
  | {type: 'setFile'; file: Dirent | null}
  | {
      type: 'setFileCallback';
      seq: number;
      file: Dirent | null;
      content: string;
      session: DocumentReference;
    }
  | {type: 'commit'}
  | {type: 'commitCallback'};

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
  onReady,
}: {
  children: JSX.Element;
  file: Dirent | null;
  onReady: (file: Dirent | null) => void;
}) {
  console.log('[CurrentFileContextProvider]' /*, file, onReady*/);
  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();

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
    dispatch({type: 'commit'});
  }, []);

  useEffect(() => {
    console.log('call setFileDispatch', file);
    dispatch({type: 'setFile', file: file});
  }, [file]);

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

        // 内容の編集
        case 'modify':
          console.log('modify');
          // 2秒たっても次のmodifyがこなければsessionを更新する
          if(state.timer) {
            clearTimeout(state.timer);            
          }
          const timer = setTimeout(()=>{
            console.log('modify uppdate session');
            updateDoc(state.session!,{
              userUpdatedAt: serverTimestamp(),
              text: action.text,
            })
            .then(() => {
            });
          },2000);
          return {...state, state: FileState.modified, text: action.text, timer};

        // ファイルの選択
        case 'setFile':
          console.log('setFile', action);
          if(state.state == FileState.modified || state.state == FileState.saved) {
            if(! confirm('ファイルを保存していません。変更を破棄しますか?')){
              // ファイルの切り替えをキャンセル
              return state;
            }
          }
          // 同じファイルを選択した場合何もしない
          if (
            (action.file == null && state.file == null) ||
            action.file?.name === state.file?.name // TODO: 違うブランチ/ディレクトリの同名ファイルに注意 ブランチやディレクトリ変更でリセットすること
          ) {
            if(isEditableFile(action.file?.name)) {
              // 同じファイルを選択していても編集可能ファイルならスピナーを解除する
              onReady(action.file);
              return {...state, state: FileState.init};
            }
            return state;
          }
          if (!action.file) {
            // 選択解除
            onReady(null);
            return {...state, file: null, state: FileState.none, timer:undefined};
          }
          const filePath = action.file?.name!;
          const dir = repository.currentTree.map(t=>t.name).join('/');
          const path = upath.join(dir,filePath);
          console.log('setFile filePath', path);
          if (action.file) {
            log.info('ファイルが選択されました : ' + path);
          }
          if (!isEditableFile(path)) {
            // 画像などのエディタで編集不可能なファイル
            // TODO: 画像ビューワー
            log.error(
              '編集できないファイル形式です : ' + path,
              3000,
            );
            onReady(action.file);
            return {...state, state: FileState.none, timer:undefined};
          }
          const props = {
            user: app.user!,
            owner: repository.owner!,
            repo: repository.repo!,
            branch: repository.branch!,
          };
          console.log('setFile props',props);

          WebApiFs.open(props)
            .then((fs) => {
              fs.readFile(path)
              .then((content) => {
                // console.log('dispatch setFileCallback', seq,action.file,content);
                if (content == undefined || content == null) { // 0バイトのファイルがあるため、!contentでは駄目
                  log.error(
                    `ファイルの取得が出来ませんでした(${path}) : ${content}`,
                    3000,
                  );
                  return state;
                }
                fs.getFileSession(path)
                  .then((session) => {
                    dispatch({
                      type: 'setFileCallback',
                      seq,
                      file: action.file,
                      content: content.toString(),
                      session,
                    });
                  })
                  .catch((err) => {
                    log.error(
                      `セッション情報が取得できませんでした(${path}): ${err.message}`,
                      3000,
                    );
                  });
              });
            })
            .catch((err) => {
              log.error(
                `ファイルの取得が出来ませんでした(${path}) : ${err.messsage}`,
                3000,
              );
              console.error(err);
              onReady(action.file);
            });
          return {...state, state: FileState.none};

        // ファイルの選択が完了
        case 'setFileCallback':
          console.log('setFileCallback' /*, action*/);
          // 多重処理をキャンセル
          if (action.seq != seq) {
            console.log('dispatch cancel');
            return state;
          } else {
            seq++;
          }
          if (action.file) {
            onReady(action.file);
            return {
              ...state,
              state: FileState.init,
              file: action.file,
              text: action.content,
              ext: getExt(action.file.name),
              session: action.session,
            };
          } else {
            // ファイル情報が取得できなかった
            log.error(`ファイル情報が取得できませんでした(${action.file!.name!})`);
            onReady(action.file);
            return {
              ...state,
              state: FileState.none,
              file: null,
              session: undefined,
            };
          }
        
        // ファイルを保存
        case 'commit':
          (async () => {
          await fetch(
              '/api/github/commitSession',
              {
                method: 'PUT',
                body: JSON.stringify({sessionId:state.session?.id, branch:repository.branch}),
                headers: {
                  'content-type': 'application/json',
                  'x-id-token': await app.user!.getIdToken(),
                },
              },
            ).then(()=>{
              log.success(`ファイルを保存しました(${path})`);
              dispatch({type:"commitCallback"});
            }).catch((err)=>{
              log.error(`ファイルの保存に失敗しました。(${path}) : ${err.message}`);
            });
          })();
          return state;
        case 'commitCallback':
          return {...state, state: FileState.clean};
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, repository],
  );
  const [context, dispatch] = useReducer(reducer, initialState);

  return (
    <CurrentFileContext.Provider value={context}>
      {children}
    </CurrentFileContext.Provider>
  );
}
