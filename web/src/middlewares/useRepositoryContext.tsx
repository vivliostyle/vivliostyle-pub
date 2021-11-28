import {Dirent} from 'fs-extra';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {fetchBranches} from './frontendFunctions';
import {useAppContext} from './useAppContext';
import {CurrentFileContextProvider} from './useCurrentFileContext';
import {useLogContext} from './useLogContext';
import {useVivlioStyleConfig} from './useVivliostyleConfig';
import {CoreProps} from './vivliostyle.config';
import {WebApiFs} from './WebApiFS';

export type Repository = {
  id: number;
  node_id: string;
  private: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  currentFile: Dirent | null;
  currentConfig: CoreProps | null;
  currentTree: Dirent[];
  branches: string[];
  full_name: string;
  defaultBranch: string;

  files: Dirent[];
  selectBranch: (branch: string) => void;
  selectTree: (tree: '.' | '..' | Dirent) => void; // .は現在のディレクトリのリロード用
  selectFile: (path: Dirent | null, key: number) => void;
  fs: WebApiFs | null;
  // getFileContent: () => Promise<any>;
};

const RepositoryContext = createContext({} as Repository);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

type Actions =
  | {
      type: 'selectRepository';
      owner: string;
      repo: string;
      branches: string[];
      defaultBranch: string;
      files: Dirent[];
    }
  | {type: 'selectBranch'; branch: string}
  | {type: 'selectBranchCallback'; branch: string; files: Dirent[]}
  | {type: 'selectTree'; tree: '.' | '..' | Dirent}
  | {type: 'selectTreeCallback'; tree: Dirent[]; files: Dirent[]}
  | {type: 'setFiles'; files: Dirent[]}
  | {type: 'selectFile'; file: Dirent | null; key: number}
  | {type: 'selectFileCallback'; n: number; file: Dirent | null};

/**
 * RepositoryContextProviderコンポーネント
 * @param param0
 * @returns
 */
export function RepositoryContextProvider({
  children,
  owner,
  repo,
}: {
  children: JSX.Element;
  owner: string;
  repo: string;
}) {
  console.log('[repositoryContext]', owner, repo);
  const log = useLogContext();
  const app = useAppContext();
  const [file, setFile] = useState<Dirent | null>(null);

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
  const selectBranch = (branch: string) => {
    console.log('selectBranch', branch);
    if (!owner || !repo || !branch) {
      return;
    }
    if (dispatch) {
      dispatch({type: 'selectBranch', branch});
    }
  };
  /**
   * フォルダを開く
   * @param tree
   */
  const selectTree = (tree: '.' | '..' | Dirent) => {
    console.log('selectTree', tree);
    if (dispatch) {
      dispatch({type: 'selectTree', tree});
    }
  };
  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = useCallback((file: Dirent | null, key: number) => {
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
    defaultBranch: ''
  } as Repository;

  // コールバックのディスパッチが多重に処理されるのを防ぐカウンタ
  // コールバックを呼び出す側と処理する側で数値が一致していなければ多重処理になっているためキャンセルする
  let n = 0;

  const reducer = useCallback(
    (state: Repository, action: Actions): Repository => {
      switch (action.type) {
        case 'selectRepository':
          return {
            ...state,
            owner: action.owner,
            repo: action.repo,
            branches: action.branches,
            branch: action.defaultBranch,
            defaultBranch: action.defaultBranch,
            files: action.files,
          };
        case 'selectBranch':
          const props = {
            user: app.user!,
            owner: state.owner!,
            repo: state.repo!,
            branch: action.branch,
          };
          console.log('selectBranch',props);
          WebApiFs.open(props).then((fs) => {
            fs.readdir('')
              .then((files) => {
                if (dispatch) {
                  dispatch({
                    type: 'selectBranchCallback',
                    branch: action.branch,
                    files,
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
          return {
            ...state,
            branch: action.branch,
            currentTree: [],
            files: action.files,
            currentFile: null
          };
        case 'selectTree':
          // console.log('selectTreeAction');
          const tree = [...state.currentTree];
          if (action.tree == '.') {
            // 何もせず後段でファイルリストを読み込みなおす
          }else if (action.tree == '..') {
            if (tree.length == 0) {
              return state;
            }
            tree.pop();
          } else {
            tree.push(action.tree as unknown as Dirent);
          }
          const treeProps = {
            user: app.user!,
            owner: state.owner!,
            repo: state.repo!,
            branch: state.branch!,
          };
          const path = tree.map(t=>t.name).join('/');
          // console.log('selectTree props',treeProps, path);
          WebApiFs.open(treeProps)
            .then((fs) => {
              fs.readdir(path)
                .then((files) => {
                  console.log('success',path);
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
    (owner: string, repo: string) => {
      if (!app.user || app.isPending) {
        return null;
      }
      console.log('selectRepostiory', owner, repo);
      (async () => {
        const repository = app.repositories?.find(rep=>rep.owner == owner && rep.repo == repo);
        if(!repository) {return;}
        const branches = repository.branches;
        const defaultBranch = repository.defaultBranch;
        const props = {
          user: app.user!,
          owner,
          repo,
          branch: defaultBranch,
        };
        console.log('selectRepository',props);
        const fs: WebApiFs = await WebApiFs.open(props);
        const files = await fs.readdir('/');
        if (dispatch) {
          dispatch({
            type: 'selectRepository',
            owner,
            repo,
            branches,
            defaultBranch,
            files,
          });
        }
        // fetchFiles(app.user!, owner, repo, defaultBranch, '')
        //   .then((files) => {

        //   })
        //   .catch((e) => console.error(e));
      })();
    },
    [app.isPending, app.user],
  );

  useEffect(() => {
    if (!app.user || app.isPending) {
      return;
    }
    selectRepository(owner, repo);
  }, [app.isPending, app.user, owner, repo, selectRepository]);

  /**
   * ファイルの内容を読み込み完了し、編集可能な状態になった
   */
  const onReady = useCallback(
    (currentFile: Dirent | null) => {
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
      <CurrentFileContextProvider onReady={onReady} file={file}>
        {children}
      </CurrentFileContextProvider>
    </RepositoryContext.Provider>
  );
}
