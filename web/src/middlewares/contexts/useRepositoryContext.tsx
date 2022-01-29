import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {VFile} from 'theme-manager';
import {useAppContext} from './useAppContext';
import {CurrentFileContextProvider} from './useCurrentFileContext';
import {useLogContext} from './useLogContext';
import {CoreProps} from '../vivliostyle.config';
import {WebApiFs} from '../fs/WebApiFS';
import {gql} from '@apollo/client';
import upath from 'upath';

export type Repository = {
  id: number;
  node_id: string;
  private: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  currentFile: VFile | null;
  currentConfig: CoreProps | null;
  currentTree: VFile[]; // カレントディレクトリを配列として保持 Rootは含まない 例 /Sub/Sub2 => [SubのVFile,Sub2のVFile]
  branches: string[];
  full_name: string;
  defaultBranch: string;

  files: VFile[];
  selectBranch: (branch: string) => void;
  selectTree: (tree: '.' | '..' | VFile) => void; // .は現在のディレクトリのリロード用
  selectFile: (path: VFile | null, key: number) => void;
  createFile: (path: string, file: File) => void; // JavaScript標準のFile TODO: VFileにできればする
  fs: WebApiFs | null;
  // getFileContent: () => Promise<any>;
};

const RepositoryContext = createContext({} as Repository);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

type Actions =
  | {
      type: 'selectRepositoryCallback';
      owner: string;
      repo: string;
      branches: string[];
      defaultBranch: string;
      branch: string;
      files: VFile[];
      file?: VFile;
    }
  | {type: 'selectBranch'; branch: string; tree?:VFile[]; }
  | {type: 'selectBranchCallback'; branch: string; files: VFile[]; tree?: VFile[];}
  | {type: 'selectTree'; tree: '.' | '..' | VFile;}
  | {type: 'selectTreeCallback'; tree: VFile[]; files: VFile[];}
  | {type: 'setFiles'; files: VFile[];}
  | {type: 'selectFile'; file: VFile | null; key: number;}
  | {type: 'selectFileCallback'; n: number; file: VFile | null; }
  | {type: 'createFile'; path: string; file: File; }; // ここはVFileではなくJavaScript標準のFile

/**
 * RepositoryContextProviderコンポーネント
 * @param param0
 * @returns
 */
export function RepositoryContextProvider({
  children,
  owner,
  repo,
  branch,
  file
}: {
  children: JSX.Element;
  owner: string;
  repo: string;
  branch?: string;
  file?: string;
}) {
  console.log('[repositoryContext]', owner, repo);
  const log = useLogContext();
  const app = useAppContext();
  const [currentFile, setFile] = useState<VFile | null>(null);

  const config = async () => {
    // const config = useVivlioStyleConfig({
    //     user: app.user,
    //     owner: repository.owner!,
    //     repo: repository.repo!,
    //     branch: repository.branch!,
    //   });
    const config = {};
    return config;
  };

  /**
   * ブランチの選択
   * @param branch
   */
  const selectBranch = useCallback((branch: string) => {
    console.log('selectBranch', branch);
    if (!owner || !repo || !branch) {
      return;
    }
    if (dispatch) {
      dispatch({type: 'selectBranch', branch});
    }
  },[owner, repo]);
  /**
   * フォルダを開く
   * @param tree
   */
  const selectTree = (tree: '.' | '..' | VFile) => {
    console.log('selectTree', tree);
    if (dispatch) {
      dispatch({type: 'selectTree', tree});
    }
  };
  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = useCallback((file: VFile | null, key: number) => {
    console.log('selectFile', key, file);
    if (dispatch) {
      dispatch({type: 'selectFile', file, key});
    }

    // 対象ファイルが切り替えられたらWebAPIを通してファイルの情報を要求する
  }, []);

  // const getFileContent = async () => {};

  const state = {
    id: 0,
    node_id: '',
    private: false,
    owner: null,
    repo: null,
    full_name: '',
    branches: [],
    files: [],
    branch: null,
    currentTree: [],
    currentFile: null,
    currentConfig: null,
    selectBranch,
    selectTree,
    selectFile,
    fs: null,
    // getFileContent,
    defaultBranch: '',
    createFile: (path: string, file: File) => {
      dispatch({type: 'createFile', path, file});
    },
  } as Repository;

  // コールバックのディスパッチが多重に処理されるのを防ぐカウンタ
  // コールバックを呼び出す側と処理する側で数値が一致していなければ多重処理になっているためキャンセルする
  let n = 0;

  const reducer = useCallback(
    (state: Repository, action: Actions): Repository => {
      switch (action.type) {
        case 'selectRepositoryCallback':
          if(action.file) {
            setFile(action.file);
          }
          return {
            ...state,
            owner: action.owner,
            repo: action.repo,
            branches: action.branches,
            defaultBranch: action.defaultBranch,
            branch: action.branch,
            files: action.files,
          };
        case 'selectBranch':
          if( !(app.user && state.owner && state.repo && action.branch) || state.branch === action.branch ) { return state; }
          const props = {
            user: app.user!,
            owner: state.owner!,
            repo: state.repo!,
            branch: action.branch,
          };
          const dirname = action.tree ? action.tree.map(t=>t.name).join('/') : ''; 
          WebApiFs.open(props).then((fs) => {
            fs.readdir(dirname)
              .then((files) => {
                if (dispatch) {
                  dispatch({
                    type: 'selectBranchCallback',
                    branch: action.branch,
                    files,
                    tree: action.tree
                  });
                }
              })
              .catch((err) => {
                console.error(err);
              });
          });
          return state;
        case 'selectBranchCallback':
          // TODO: ブランチ毎のカレントディレクトリを保持する
          setFile(null);
          const url = new URL(window.location.toString());
          url.searchParams.set('branch', action.branch);
          url.searchParams.delete('file');
          history.pushState({}, '', url);
          return {
            ...state,
            branch: action.branch,
            currentTree: action.tree??[],
            files: action.files,
            currentFile: null,
          };
        case 'selectTree':
          // console.log('selectTreeAction');
          const tree = [...state.currentTree];
          if (action.tree == '.') {
            // 何もせず後段でファイルリストを読み込みなおす
          } else if (action.tree == '..') {
            if (tree.length == 0) {
              return state;
            }
            tree.pop();
          } else {
            tree.push(action.tree as unknown as VFile);
          }
          const treeProps = {
            user: app.user!,
            owner: state.owner!,
            repo: state.repo!,
            branch: state.branch!,
          };
          const path = tree.map((t) => t.name).join('/');
          // console.log('selectTree props',treeProps, path);
          WebApiFs.open(treeProps)
            .then((fs) => {
              fs.readdir(path)
                .then((files) => {
                  console.log('success', path);
                  dispatch({type: 'selectTreeCallback', tree, files});
                })
                .catch((err) => {
                  throw err;
                });
            })
            .catch((err) => {
              throw err;
            });
          return state;
        case 'selectTreeCallback':
          console.log('selectTreeCallback', action);
          return {...state, currentTree: action.tree, files: action.files};
        case 'setFiles':
          console.log('setFiles', action.files);
          return {...state, files: action.files};
        case 'selectFile':
          console.log('selectFileAction', action);
          setFile(action.file);
          return state;
        case 'selectFileCallback':
          //   console.log('selectFileCallback', action.n, n, action.file);
          //   if (action.n != n) {
          //     console.log('dispatch cancel');
          //     return state;
          //   } else {
          //     console.log('...');
          //   } /* 多重処理をキャンセル */
          //   n++;
          //   if (action.file) {
          //     // ファイル情報が取得できたら対象ファイルを変更してstateをcleanにする
          //     // if (action.file.session) {
          //     //   // setSession(file.session);
          //     // }
          //     // previewSource.changeFile(path, file.text);
          //     console.log('log.info');
          //     log.info(
          //       'ファイルを選択しました :' +
          //         state.currentFile?.path +
          //         ' > ' +
          //         action.file.path,
          //     );
          //     return {...state, currentFile: action.file};
          //   } else {
          //     // ファイル情報が取得できなかった
          //     console.error('file not found');
          //     return state;
          //   }
          return state;
        case 'createFile':
          // console.log('createFile action', action.path, action.file);
          var encodedData = Buffer.from("\n", 'utf8').toString('base64');
          // console.log('encodedData', encodedData);
          app.gqlclient?.mutate({mutation:gql`
            mutation createFile($owner: String!, $repo: String!, $branch: String!, $path: String!, $encodedData: String!, $message: String!) {
              commitContent(params:{
                owner: $owner,
                repo: $repo,
                branch: $branch,
                newPath: $path,
                newContent: $encodedData,
                message: $message
              }) {
                state,
                message
              }
            }
          `,
            variables: { owner, repo, branch:state.branch, path:action.path, encodedData, message:"create file"}
          }).then((result:any)=>{
            if(result.data.commitContent.state) {
              log.success(`ファイルを作成しました : ${action.path}`, 1000);
              // ファイルリストを更新する
              // TODO: mutationの結果として取得することでリクエスト回数を減らす
              dispatch({type: 'selectBranch', branch: state.branch!, tree: state.currentTree});  
            }else{
              log.error(
                `ファイル(${action.path})が作成できませんでした : ${result.data.commitContent.message}`,
                1000,
              );  
            }
          }).catch((error)=>{
            log.error(
              `ファイル(${action.path})が作成できませんでした : ${error.message}`,
              1000,
            );
          });
          return state;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [repository, dispatch] = useReducer(reducer, state);

  /**
   *
   */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const selectRepository = useCallback(
    (owner: string, repo: string, branch?: string, filePath?: string) => {
      if (!app.user || app.isPending) {
        return null;
      }
      console.log('selectRepostiory', owner, repo, branch, filePath);
      (async () => {
        const repository = app.repositories?.find(
          (rep) => rep.owner == owner && rep.repo == repo,
        );
        if (!repository) {
          return;
        }
        const branches = repository.branches;
        const defaultBranch = repository.defaultBranch;
        const props = {
          user: app.user!,
          owner,
          repo,
          branch: branch ?? defaultBranch,
        };
        console.log('selectRepository', props);
        const fs: WebApiFs = await WebApiFs.open(props);
        const dirname = filePath ? upath.dirname(filePath):'';
        const files = await fs.readdir(dirname);
        let file;
        if(filePath) {
          const name = upath.basename(filePath);
          file = new VFile({fs,dirname,type:'file',name});
        }

        if (dispatch) {
          dispatch({
            type: 'selectRepositoryCallback',
            owner,
            repo,
            branches,
            defaultBranch,
            branch: branch ?? defaultBranch,
            files,
            file
          });
        }

      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.isPending, app.user],
  );

  useEffect(() => {
    if (!app.user || app.isPending) {
      return;
    }
    selectRepository(owner, repo, branch, file);
  }, [app.isPending, app.user, branch, file, owner, repo, selectRepository]);


  /**
   * ファイルの内容を読み込み完了し、編集可能な状態になった
   */
  const onReady = useCallback(
    (currentFile: VFile | null) => {
      console.log('onReady', currentFile);
      dispatch({type: 'selectFileCallback', file: currentFile, n});
    },
    [n],
  );

  /*
    1. currentFileが変更される
    2. CurrentFileContextProvider内でファイルコンテントの読み込みなどを行なう
    3. イベントハンドラで変更がRepositoContextProviderに通知される
    4. repository.currentFileが変更される
    5. 購読者に変更通知
  */
  return (
    <RepositoryContext.Provider value={repository}>
      <CurrentFileContextProvider onReady={onReady} file={currentFile}>
        {children}
      </CurrentFileContextProvider>
    </RepositoryContext.Provider>
  );
}
