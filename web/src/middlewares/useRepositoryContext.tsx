import {User} from '@firebase/auth';
import {DocumentReference} from 'firebase/firestore';
import {BranchesApiResponse} from 'pages/api/github/branches';
import {CommitsOfRepositoryApiResponse} from 'pages/api/github/tree';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {CurrentFile, isEditableFile, readFile} from './frontendFunctions';
import {useAppContext} from './useAppContext';
import { useLogContext } from './useLogContext';
import {useVivlioStyleConfig} from './useVivliostyleConfig';
import {CoreProps} from './vivliostyle.config';

type Repository = {
  owner: string | null;
  repo: string | null;
  currentBranch: string | null;
  currentFile: CurrentFile | null;
  currentConfig: CoreProps | null;
  currentTree: FileEntry[];
  branches: string[];
  files: FileEntry[];
  selectBranch: (branch: string) => void;
  selectTree: (tree: '..' | FileEntry) => void;
  selectFile: (path: FileEntry | null) => void;
};

const RepositoryContext = createContext({} as Repository);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

export type FileEntry = {
  mode: string;
  path: string;
  sha: string;
  type: string;
  url: string;
};

type Actions =
  | {
      type: 'selectRepository';
      owner: string;
      repo: string;
      branches: string[];
      defaultBranch: string;
      files: FileEntry[];
    }
  | {type: 'selectBranch'; branch: string; files: FileEntry[]}
  | {type: 'selectTree'; tree: '..' | FileEntry}
  | {type: 'selectTreeCallback'; tree: FileEntry[]; files: FileEntry[]}
  | {type: 'setFiles'; files: FileEntry[]}
  | {type: 'selectFile'; file: FileEntry | null}
  | {type: 'selectFileCallback'; file: CurrentFile | null};

export function RepositoryContextProvider({
  children,
  owner,
  repo,
}: {
  children: JSX.Element;
  owner: string;
  repo: string;
}) {
  console.log('repositoryContext', owner, repo);
  const log = useLogContext();
  const app = useAppContext();

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
    tree_sha: string,
  ): Promise<FileEntry[]> => {
    console.log('fetchFiles', owner, repo, branch);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(
        `/api/github/tree?${new URLSearchParams({
          owner,
          repo,
          branch,
          tree_sha,
        })}`,
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
    if (!state.owner || !state.repo || branch) {
      return;
    }
    // TODO: ブランチに属するファイル一覧を取得する
    fetchFiles(app.user!, state.owner!, state.repo!, branch, '')
      .then((files) => {
        if (dispatch) {
          dispatch({type: 'selectBranch', branch, files});
        }
      })
      .catch((e) => console.error(e));
  };
  /**
   *
   * @param tree
   */
  const selectTree = (tree: '..' | FileEntry) => {
    // TODO: ブランチに属するファイル一覧を取得する
    console.log('selectTree', tree);
    if (dispatch) {
      dispatch({type: 'selectTree', tree});
    }
  };
  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = (file: FileEntry | null) => {
    console.log('selectFile', file);
    if (dispatch) {
      dispatch({type: 'selectFile', file});
    }

    // // 現在の対象ファイルが未コミットなら警告を表示
    // // if (
    // // status !== 'clean' &&
    // //   !confirm('ファイルが保存されていません。変更を破棄しますか?')
    // // ) {
    // //   // キャンセルなら何もしない
    // //   return;
    // // }

    // // 対象ファイルが切り替えられたらWebAPIを通してファイルの情報を要求する
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
    selectBranch,
    selectTree,
    selectFile,
  } as Repository;

  const reducer = (state: Repository, action: Actions): Repository => {
    switch (action.type) {
      case 'selectRepository':
        // selectBranch(action.defaultBranch);
        return {
          ...state,
          owner: action.owner,
          repo: action.repo,
          branches: action.branches,
          currentBranch: action.defaultBranch,
          files: action.files,
        };
      case 'selectBranch':
        // TODO: ブランチ毎のカレントディレクトリを保持する
        return {
          ...state,
          currentBranch: action.branch,
          currentTree: [],
          files: action.files,
        };
      case 'selectTree':
        console.log('selectTreeAction');
        const tree = [...state.currentTree];
        if (action.tree == '..') {
          if (tree.length == 0) {
            return state;
          }
          tree.pop();
        } else {
          tree.push(action.tree as unknown as FileEntry);
        }
        const tree_sha = tree.length == 0 ? '' : tree.slice(-1)[0].sha;
        fetchFiles(
          app.user!,
          state.owner!,
          state.repo!,
          state.currentBranch!,
          tree_sha,
        )
          .then((files) => {
            console.log('success');
            dispatch({type: 'selectTreeCallback', tree, files});
          })
          .catch((e) => console.error(e));
        console.log('selectTreeAction2');
        return state;
      case 'selectTreeCallback':
        console.log('callback', action);
        return {...state, currentTree: action.tree, files: action.files};
      case 'setFiles':
        console.log('setFiles', action.files);
        return {...state, files: action.files};
      case 'selectFile':
        console.log('selectFileAction', action);
        // 同じファイルを選択した場合何もしない
        if (
          (action.file == null && state.currentFile == null) ||
          action.file?.sha === state.currentFile?.sha
        ) {
          return state;
        }
        if (action.file == null) {
          // 選択解除
          return {...state, currentFile: null};
        }
        if (!isEditableFile(action.file.path)) {
          // 画像などのエディタで編集不可能なファイル
          // TODO: 画像ビューワー
          log.error('編集できないファイル形式です : '+ action.file.path);
          return {
            ...state,
            currentFile: {
              path: action.file.path,
              text: '',
              state: 'init',
              sha: action.file.sha,
            },
          };
        }
        readFile({
          user: app.user,
          owner: state.owner!,
          repo: state.repo!,
          branch: state.currentBranch!,
          path: action.file.path, // TODO: サブディレクトリに対応
        })
          .then((file) => {
            dispatch({type: 'selectFileCallback', file});
          })
          .catch((err) => {
            console.error(err);
          });
        return state;
      case 'selectFileCallback':
        console.log('selectFileCallback', action.file);
        if (action.file) {
          // ファイル情報が取得できたら対象ファイルを変更してstateをcleanにする
          if (action.file.session) {
            // setSession(file.session);
          }
          // previewSource.changeFile(path, file.text);
          return {...state, currentFile: action.file};
        } else {
          // ファイル情報が取得できなかった
          console.error('file not found');
          return state;
        }
    }
  };

  const [repository, dispatch] = useReducer(reducer, state);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const selectRepository = useCallback(
    (owner: string, repo: string) => {
      if (!app.user || app.isPending) {
        return null;
      }
      console.log('selectRepostiory', owner, repo);
      (async () => {
        const {branches, defaultBranch} = await fetchBranches(
          app.user!,
          owner,
          repo,
        );
        fetchFiles(app.user!, owner, repo, defaultBranch, '')
          .then((files) => {
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
          })
          .catch((e) => console.error(e));
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
  if (!user || !owner || !repo) {
    return {branches: [], defaultBranch: ''};
  }
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
