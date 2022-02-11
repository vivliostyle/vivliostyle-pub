import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {VFile} from 'theme-manager';
import {useAppContext} from './useAppContext';
import {CurrentFileContextProvider} from './useCurrentFileContext';
import {Log, useLogContext} from './useLogContext';
import {CoreProps} from '../vivliostyle.config';
import {WebApiFs} from '../fs/WebApiFS';
import {gql} from '@apollo/client';
import upath from 'upath';
import {t} from 'i18next';

export type RepositoryState = {
  id: number;
  node_id: string;
  private: boolean;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  currentConfig: CoreProps | null;
  currentTree: VFile[]; // カレントディレクトリを配列として保持 Rootは含まない 例 /Sub/Sub2 => [SubのVFile,Sub2のVFile]
  branches: string[];
  full_name: string;
  defaultBranch: string;
  files: VFile[];
  currentFile: VFile | null;
  fs: WebApiFs | null;
};

export type RepositoryContext = {
  state: RepositoryState;
  // メソッド
  selectBranch: (branch: string) => void;
  selectTree: (tree: '.' | '..' | VFile) => void; // .は現在のディレクトリのリロード用
  selectFile: (path: VFile | null) => void;
  createFile: (path: string, file: File) => void;
};

const RepositoryContext = createContext({} as RepositoryContext);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

/**
 * useReducer用のAction定義
 */
type Actions =
  | {
      type: 'selectRepository';
      func: (state: RepositoryState) => void;
    }
  | {
      type: 'selectRepositoryCallback';
      owner: string;
      repo: string;
      branches: string[];
      defaultBranch: string;
      branch: string;
      tree: VFile[];
      files: VFile[];
      file: VFile | null;
    }
  | {type: 'selectBranch'; func: (state: RepositoryState) => void}
  | {
      type: 'selectBranchCallback';
      branch: string;
      files: VFile[];
      tree?: VFile[];
      file: VFile | null;
      log: Log;
    }
  | {type: 'selectTree'; func: (state: RepositoryState) => void}
  | {type: 'selectTreeCallback'; tree: VFile[]; files: VFile[]}
  | {type: 'selectFile'; func: (state: RepositoryState) => void}
  | {type: 'selectFileCallback'; file: VFile | null}
  | {type: 'createFile'; func: (state: RepositoryState) => void};

/**
 * クエリパラメータのfile属性にファイルパスをセットする
 * @param file
 */
function setQueryParam(attr: string, value: string | null) {
  const url = new URL(window.location.toString());
  if (value) {
    url.searchParams.set(attr, value);
  } else {
    url.searchParams.delete(attr);
  }
  history.pushState({}, '', url);
}

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (state: RepositoryState, action: Actions): RepositoryState => {
  switch (action.type) {
    // カレントリポジトリ変更アクション
    case 'selectRepository':
      action.func(state);
      return state;
    case 'selectRepositoryCallback':
      setQueryParam('branch', action.branch);
      if (state.repo != action.repo || state.branch != action.branch) {
        setQueryParam('file', null);
      }
      console.log('[repositoryContext] selectRepositoryCallback', action);
      return {
        ...state,
        owner: action.owner,
        repo: action.repo,
        branches: action.branches,
        defaultBranch: action.defaultBranch,
        branch: action.branch,
        currentTree: action.tree,
        files: action.files,
        currentFile: action.file,
      };
    // カレントブランチ変更アクション
    case 'selectBranch':
      action.func(state);
      return state;
    case 'selectBranchCallback':
      // TODO: ブランチ毎のカレントディレクトリを保持する
      // クエリパラメータにブランチをセットする
      setQueryParam('branch', action.branch);
      setQueryParam('file', null);
      console.log('[repositoryContext] selectBranchCallback', action);
      action.log.info(
        t('ブランチを変更しました', {branch: action.branch}),
        1000,
      );
      return {
        ...state,
        branch: action.branch,
        currentTree: action.tree ?? [],
        files: action.files,
        currentFile: action.file,
      };
    // カレントフォルダ変更アクション
    case 'selectTree':
      action.func(state);
      return state;
    case 'selectTreeCallback':
      console.log('[repositoryContext] selectTreeCallback', action);
      return {...state, currentTree: action.tree, files: action.files};
    // 編集ファイル選択アクション
    case 'selectFile':
      action.func(state);
      return state;
    case 'selectFileCallback':
      setQueryParam('file', action.file?.path ?? null);
      console.log('[repositoryContext] selectFileCallback', action.file);
      return {...state, currentFile: action.file};
    case 'createFile':
      action.func(state);
      return state;
  }
};

/**
 * ディレクトリパス文字列をVFileの配列に変換する
 * @param dir
 */
async function dir2tree(fs: WebApiFs | null, dir: string): Promise<VFile[]> {
  const trees: VFile[] = [];
  if (fs !== null) {
    const rootFiles = await fs.readdir('');
    console.log('dir2tree root', rootFiles);
    const dirlist = dir.split('/');
    for (let d of dirlist) {
      const tree = rootFiles.find((entry: VFile) => entry.name === d);
      if (tree) {
        trees.push(tree);
      } else {
        break;
      }
    }
  }
  console.log('dir2tree', fs, dir, trees);
  return trees;
}

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
  file,
}: {
  children: JSX.Element;
  owner: string;
  repo: string;
  branch?: string;
  file?: string;
}) {
  console.log('[repositoryContext]', owner, repo, branch, file);
  const log = useLogContext();
  const app = useAppContext();

  /**
   * リポジトリを選択する
   */
  const selectRepository = useCallback(
    (owner: string, repo: string, branch?: string, filePath?: string) => {
      dispatch({
        type: 'selectRepository',
        func: (state: RepositoryState) => {
          if (!app.state.user || app.state.isPending) {
            console.log('[repositoryContext] selectRepository cancel');
            return null;
          }
          console.log(
            '[repositoryContext] selectRepostiory',
            owner,
            repo,
            branch,
            filePath,
          );
          (async () => {
            const repositoryState = app.state.repositories?.find(
              (rep) => rep.owner == owner && rep.repo == repo,
            );
            if (!repositoryState) {
              return;
            }
            const branches = repositoryState.branches;
            const defaultBranch = repositoryState.defaultBranch as string;
            branch = branch ?? defaultBranch;
            const props = {
              user: app.state.user!,
              owner,
              repo,
              branch,
            };
            console.log(
              '[repositoryContext] selectRepository WebApiFs props',
              props,
            );
            const fs: WebApiFs = await WebApiFs.open(props);
            const dirname = filePath ? upath.dirname(filePath) : '';
            const dir = dirname !== '.' ? dirname : ''; // upath.dirname('sample.md') => '.' になるため、次のreaddirでルートではなくカレントディレクトリを取得してしまう。
            const tree = await dir2tree(fs, dir);
            const files = await fs.readdir(dir);
            let file;
            if (filePath && filePath != state.currentFile?.path) {
              const name = upath.basename(filePath);
              file = new VFile({fs, dirname, type: 'file', name});
            } else {
              file = state.currentFile;
            }
            if (dispatch) {
              dispatch({
                type: 'selectRepositoryCallback',
                owner,
                repo,
                branches,
                defaultBranch,
                branch,
                tree,
                files,
                file,
              });
            }
          })();
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.state.isPending, app.state.user],
  );

  /**
   * ブランチの選択
   * @param branch
   */
  const selectBranch = useCallback(
    (newBranch: string) => {
      console.log('[repositoryContext] selectBranch', newBranch);
      dispatch({
        type: 'selectBranch',
        func: (state: RepositoryState) => {
          if (
            !state.owner ||
            !state.repo ||
            !newBranch ||
            state.branch === newBranch
          ) {
            console.log(
              '[repositoryContext] selectBranch cancel',
              state.owner,
              state.repo,
              state.branch,
              newBranch,
            );
            return;
          }
          (async () => {
            const props = {
              user: app.state.user!,
              owner: state.owner!,
              repo: state.repo!,
              branch: newBranch,
            };
            // ブランチ変更の際にはルートディレクトリをカレントディレクトリにする
            const dirname = '';
            try {
              const fs = await WebApiFs.open(props);
              const files = await fs.readdir(dirname);
              // アプリケーションキャッシュを削除する
              app.clearCache();
              dispatch({
                type: 'selectBranchCallback',
                branch: newBranch,
                files,
                log,
                file: null,
              });
            } catch (err: any) {
              console.error(err);
            }
          })();
        },
      });
    },
    [app, log],
  );

  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = useCallback((file: VFile | null) => {
    dispatch({
      type: 'selectFile',
      func: (state: RepositoryState) => {
        console.log(
          '[repositoryContext] selectFile',
          state.currentFile,
          '\n>>>>\n',
          file,
        );
        if (file?.path !== state.currentFile?.path) {
          dispatch({type: 'selectFileCallback', file});
        }
      },
    });
  }, []);

  /**
   * ファイルを新しく作成する
   */
  const createFile = useCallback(
    (path: string, file: File) => {
      dispatch({
        type: 'createFile',
        func: (state: RepositoryState) => {
          (async () => {
            // console.log('createFile action', action.path, action.file);
            var encodedData = Buffer.from('\n', 'utf8').toString('base64');
            // console.log('encodedData', encodedData);
            try {
              const result = await app.state.gqlclient?.mutate({
                mutation: gql`
                  mutation createFile(
                    $owner: String!
                    $repo: String!
                    $branch: String!
                    $path: String!
                    $encodedData: String!
                    $message: String!
                  ) {
                    commitContent(
                      params: {
                        owner: $owner
                        repo: $repo
                        branch: $branch
                        newPath: $path
                        newContent: $encodedData
                        message: $message
                      }
                    ) {
                      state
                      message
                    }
                  }
                `,
                variables: {
                  owner: state.owner,
                  repo: state.repo,
                  branch: state.branch,
                  path: path,
                  encodedData,
                  message: 'create file',
                },
              });
              if (!result) {
                return;
              }
              if (result.data.commitContent.state) {
                log.success(
                  t('ファイルを作成しました', {filepath: path}),
                  1000,
                );
                // ファイルリストを更新する
                // TODO: mutationの結果として取得することでリクエスト回数を減らす
                if (state.branch) {
                  selectBranch(state.branch);
                }
              } else {
                log.error(
                  t('ファイルが作成できませんでした', {
                    filepath: path,
                    error: result.data.commitContent.message,
                  }),
                  1000,
                );
              }
            } catch (err: any) {
              log.error(
                t('ファイルが作成できませんでした', {
                  filepath: path,
                  error: err.message,
                }),
                1000,
              );
            }
          })();
        },
      });
    },
    [app, branch, log, owner, repo, selectBranch],
  );

  /**
   * フォルダを開く
   * @param tree
   */
  const selectTree = useCallback((tree: '.' | '..' | VFile) => {
    // stateが必要な処理と非同期処理が不可分な場合に
    // useReducerで無理矢理に非同期処理を実行する
    dispatch({
      type: 'selectTree',
      func: (state: RepositoryState) => {
        (async () => {
          console.log('[repositoryContext] selectTree', tree);
          // console.log('selectTreeAction');
          const trees = [...state.currentTree];
          if (tree == '.') {
            // 何もせず後段でファイルリストを読み込みなおす
          } else if (tree == '..') {
            if (trees.length > 0) {
              // ルートフォルダ以外ならひとつ上る
              trees.pop();
            }
          } else {
            trees.push(tree as unknown as VFile);
          }
          const treeProps = {
            user: app.state.user!,
            owner: state.owner!,
            repo: state.repo!,
            branch: state.branch!,
          };
          const path = trees.map((t) => t.name).join('/');
          try {
            const fs = await WebApiFs.open(treeProps);
            const files = await fs.readdir(path);
            dispatch({type: 'selectTreeCallback', tree: trees, files});
          } catch (err: any) {
            throw err;
          }
        })();
      },
    });
  }, []);

  const initialState = {
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
    fs: null,
    defaultBranch: '',
  } as RepositoryState;

  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      state,
      selectBranch,
      selectTree,
      selectFile,
      createFile,
    }),
    [createFile, selectBranch, selectFile, selectTree, state],
  );

  useEffect(() => {
    console.log('[repositoryContext] init ', owner, repo, branch, file);
    if (!app.state.user || app.state.isPending) {
      return;
    }
    selectRepository(owner, repo, branch, file);
  }, [
    app.state.isPending,
    app.state.user,
    branch,
    file,
    owner,
    repo,
    selectRepository,
  ]);

  /*
    1. currentFileが変更される
    2. CurrentFileContextProvider内でファイルコンテントの読み込みなどを行なう
    3. onReadyイベントハンドラで変更がRepositoContextProviderに通知される
    4. repository.currentFileが変更される
    5. 購読者に変更通知
  */
  return (
    <RepositoryContext.Provider value={value}>
      <CurrentFileContextProvider
        repository={value}
        file={value.state.currentFile}
      >
        {children}
      </CurrentFileContextProvider>
    </RepositoryContext.Provider>
  );
}
