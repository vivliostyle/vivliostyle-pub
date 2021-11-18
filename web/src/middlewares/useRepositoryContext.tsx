import {User} from '@firebase/auth';
import {DocumentReference} from 'firebase/firestore';
import {BranchesApiResponse} from 'pages/api/github/branches';
import {CommitsOfRepositoryApiResponse} from 'pages/api/github/tree';
import {
  createContext,
  Dispatch,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {useAppContext} from './useAppContext';
import {useVivlioStyleConfig} from './useVivliostyleConfig';
import {CoreProps} from './vivliostyle.config';

export type FileState = 'init' | 'clean' | 'modified' | 'saved';
export type CurrentFile = {
  text: string;
  state: FileState;
  path: string;
  session?: DocumentReference;
};

type Repository = {
  owner: string | null;
  setOwner: () => void;
  repo: string | null;
  setRepo: () => void;
  currentBranch: string | null;
  currentFile: CurrentFile | null;
  currentConfig: CoreProps | null;
  currentTree: FileEntry[];
  branches: string[];
  files: FileEntry[];
  selectRepository: (owner: string, repo: string) => void;
  selectBranch: (branch: string) => void;
  selectTree: (tree: '..'|FileEntry)=>void;
  selectFile: (path: string | null) => void;
};

const RepositoryContext = createContext({} as Repository);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

export type FileEntry = {
  mode:string;
  path: string;
  sha: string;
  type: string;
  url: string;
}

type Actions =
  | {
      type: 'selectRepository';
      owner: string;
      repo: string;
      branches: string[];
      defaultBranch: string;
    }
  | {type: 'selectBranch'; branch: string}
  | {type: 'selectTree'; tree: '..'|FileEntry}
  | {type: 'setFiles'; files: FileEntry[]};


export function RepositoryContextProvider({
  children,
  owner,
  repo,
}: {
  children: JSX.Element;
  owner: string;
  repo: string;
}) {
  const app = useAppContext();
  let dispatcher: Dispatch<Actions> | undefined;



  const setOwner = () => {};

  const setRepo = () => {};

  const selectRepository = useCallback(
    (owner: string, repo: string) => {
      if(!app.user) {return;}
      console.log('selectRepostiory',owner,repo);
      (async () => {
        const {branches, defaultBranch} = await fetchBranches(
          app.user!,
          owner,
          repo,
        );
        if (dispatcher) {
          // デフォルトブランチを選択
          dispatcher({
            type: 'selectRepository',
            owner,
            repo,
            branches,
            defaultBranch: defaultBranch,
          });
        }
      })();
    },
    [app.user, dispatcher],
  );

  useEffect(() => {
    if (!owner || !repo) return;
    selectRepository(owner, repo);
  }, [owner, repo, selectRepository]);

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
   * ブランチに存在する全てのファイル名を取得
   */
  const fetchFiles = async (
    user: User,
    owner: string,
    repo: string,
    branch: string,
    tree_sha: string
  ): Promise<FileEntry[]> => {
    console.log(user, owner, repo, branch);
      try {
        const token = await user.getIdToken();
        const resp = await fetch(
          `/api/github/tree?${new URLSearchParams({owner, repo, branch, tree_sha})}`,
          {
            method: 'GET',
            headers: {
              'x-id-token': token,
            },
          },
        );
        const data = (await resp.json()) as CommitsOfRepositoryApiResponse;
        console.log('data', data.tree);
        const files = data.tree.map((tree) => {
          return tree as FileEntry;
        });
        // console.log('files',files);
        return files;
      } catch (error) {
        console.error(error);
        throw error;
      }
  };

  /**
   *
   * @param branch
   */
  const selectBranch = (branch: string) => {
    // TODO: ブランチに属するファイル一覧を取得する
    if (dispatcher) {
      dispatcher({type: 'selectBranch', branch});
    }
  };
  /**
   *
   * @param tree
   */
   const selectTree = (tree: '..'|FileEntry) => {
    // TODO: ブランチに属するファイル一覧を取得する
    if (dispatcher) {
      dispatcher({type: 'selectTree', tree});
    }
  };
  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = (path: string | null) => {
    // 同じファイルを選択した場合何もしない
    // if (path === previewSource.path) {
    //   return;
    // }
    // // 現在の対象ファイルが未コミットなら警告を表示
    // // if (
    // // status !== 'clean' &&
    // //   !confirm('ファイルが保存されていません。変更を破棄しますか?')
    // // ) {
    // //   // キャンセルなら何もしない
    // //   return;
    // // }
    // if (path == null) {
    //   setCurrentFile({text: '', path: '', state: 'init'});
    //   return;
    // }
    // // 対象ファイルが切り替えられたらWebAPIを通してファイルの情報を要求する
    // readFile({
    //   user: app.user,
    //   owner: ownerRepo!.owner,
    //   repo: ownerRepo!.repo!,
    //   branch: repository.branch!,
    //   path: path,
    // })
    //   .then((file) => {
    //     if (file) {
    //       // ファイル情報が取得できたら対象ファイルを変更してstateをcleanにする
    //       setCurrentFile(file);
    //       setStatus('clean');
    //       if (file.session) {
    //         setSession(file.session);
    //       }
    //       previewSource.changeFile(path, file.text);
    //     } else {
    //       // ファイル情報が取得できなかった
    //       console.error('file not found');
    //     }
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //   });
  };

  const state = {
    owner: null,
    repo: null,
    branches: [],
    files: [],
    currentBranch: null,
    currentTree: [],
    currentFile: null,
    currentConfig: null,
    setOwner,
    setRepo,
    selectRepository,
    selectBranch,
    selectTree,
    selectFile,
  } as Repository;

  const reducer = (state: Repository, action: Actions): Repository => {
    switch (action.type) {
      case 'selectRepository':
        selectBranch(action.defaultBranch);
        return {
          ...state,
          owner: action.owner,
          repo: action.repo,
          branches: action.branches,
          currentBranch: action.defaultBranch,
        };
      case 'selectBranch':
        if(!state.owner || !state.repo || !action.branch){ return state; } 
        fetchFiles(app.user!, state.owner!, state.repo!, action.branch!, '').then((files)=>{
          if (dispatch) {
            dispatch({type: 'setFiles', files});
          }
        }).catch((e)=>console.error(e));
        // TODO: ブランチ毎のカレントディレクトリを保持する
        return {...state, currentBranch: action.branch, currentTree: []};
      case 'selectTree':
        console.log('selectTree',action.tree);
        if(action.tree == '..') {
          state.currentTree.pop();
        }else{
          state.currentTree.push(action.tree as unknown as FileEntry);
        }
        fetchFiles(app.user!, state.owner!, state.repo!, state.currentBranch!, action.tree.sha).then((files)=>{
          if (dispatch) {
            dispatch({type: 'setFiles', files});
          }
        }).catch((e)=>console.error(e));
      return {...state, currentTree: [...state.currentTree]};
      case 'setFiles':
        console.log('setFiles',action.files);
        return {...state, files: action.files};
    }
  };

  const [repository, dispatch] = useReducer(reducer, state);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dispatcher = dispatch;
  }, [dispatch]);

  useEffect(()=>{
    selectRepository(owner,repo);
  },[owner, repo, selectRepository]);

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
}

const fetchBranches = async (
  user: User,
  owner: string,
  repo: string,
): Promise<{
  branches: string[];
  defaultBranch: string;
}> => {
  try {
    const token = await user.getIdToken();
    const resp = await fetch(
      `/api/github/branches?${new URLSearchParams({owner, repo})}`,
      {
        method: 'GET',
        headers: {
          'x-id-token': token,
        },
      },
    );
    const data = (await resp.json()) as BranchesApiResponse;
    const branches = data.branches.map((b) => b.name);
    const defaultBranch = data.default;
    return {branches, defaultBranch};
  } catch (error) {
    console.error(error);
    throw error;
  }
};
