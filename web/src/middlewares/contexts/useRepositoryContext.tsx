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
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[useRepositoryContext]');

export type RepositoryState = {
  id: string;
  private: boolean;
  owner: string | null;
  branch: string | null;
  currentConfig: CoreProps | null;
  currentTree: VFile[]; // カレントディレクトリを配列として保持 Rootは含まない 例 /Sub/Sub2 => [SubのVFile,Sub2のVFile]
  branches: string[];
  name: string;
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
  createBranch: (fromBranch: string, newBranch: string) => void;
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
      repository: RepositoryState;
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
  | {type: 'createBranch'; func: (state: RepositoryState) => void}
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
      if (
        state.name != action.repository.name ||
        state.branch != action.branch
      ) {
        setQueryParam('file', null);
      }
      _log('selectRepositoryCallback', action);
      return {
        // AppContextから引き継いだプロパティ
        ...action.repository,
        // selectRepositoryアクションで取得したプロパティ
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
      _log('selectBranchCallback', action);
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
    // ブランチ作成アクション
    case 'createBranch':
      action.func(state);
      return state;
    // カレントフォルダ変更アクション
    case 'selectTree':
      action.func(state);
      return state;
    case 'selectTreeCallback':
      _log('selectTreeCallback', action);
      return {...state, currentTree: action.tree, files: action.files};
    // 編集ファイル選択アクション
    case 'selectFile':
      action.func(state);
      return state;
    case 'selectFileCallback':
      setQueryParam('file', action.file?.path ?? null);
      _log('selectFileCallback', action.file);
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
    _log('dir2tree root', rootFiles);
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
  _log('dir2tree', fs, dir, trees);
  return trees;
}

/**
 * RepositoryContextProviderコンポーネント
 * @param param0
 * @returns
 */
export function RepositoryContextProvider({
  children,
  repository,
  branch,
  file,
}: {
  children: JSX.Element;
  repository?: RepositoryState;
  branch?: string;
  file?: string;
}) {
  _log(repository, branch, file);
  const log = useLogContext();
  const app = useAppContext();

  /**
   * リポジトリを選択する
   */
  const selectRepository = useCallback(
    /**
     *
     * @param repository 選択されたリポジトリ
     * @param branch 選択されたブランチ ?branch=
     * @param filePath 選択されたブランチ ?file=
     */
    (repository?: RepositoryState, branch?: string, filePath?: string) => {
      dispatch({
        type: 'selectRepository',
        func: (state: RepositoryState) => {
          if (!app.state.user || app.state.isPending) {
            _log('selectRepository cancel');
            return null;
          }
          _log('selectRepostiory', branch, filePath);
          (async () => {
            if (!repository) {
              return;
            }
            const defaultBranch = repository.defaultBranch;
            branch = branch ?? defaultBranch;
            let tree: VFile[] = [];
            let files: VFile[] = [];
            let file: VFile | null = null;
            // GitHubで作成直後はブランチの無いリポジトリもあるためチェックする
            if (branch) {
              const props = {
                user: app.state.user!,
                owner: repository.owner!,
                repo: repository.name,
                branch,
              };
              _log('selectRepository WebApiFs props', props);
              const fs: WebApiFs = await WebApiFs.open(props);
              const dirname = filePath ? upath.dirname(filePath) : '';
              const dir = dirname !== '.' ? dirname : ''; // upath.dirname('sample.md') => '.' になるため
              const tree = await dir2tree(fs, dir);
              const files = await fs.readdir(dir);
              let file;
              if (filePath && filePath != state.currentFile?.path) {
                const name = upath.basename(filePath);
                file = new VFile({fs, dirname, type: 'file', name});
              } else {
                file = state.currentFile;
              }
            }
            if (dispatch) {
              dispatch({
                type: 'selectRepositoryCallback',
                repository,
                branch, // カレントブランチ
                tree, // カレントディレクトリ
                files, // カレントディレクトリのファイルリスト
                file, // カレントファイル
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
      _log('selectBranch', newBranch);
      dispatch({
        type: 'selectBranch',
        func: (state: RepositoryState) => {
          if (
            !state.owner ||
            !state.name ||
            !newBranch ||
            state.branch === newBranch
          ) {
            _log(
              'selectBranch cancel',
              state.owner,
              state.name,
              state.branch,
              newBranch,
            );
            return;
          }
          (async () => {
            const props = {
              user: app.state.user!,
              owner: state.owner!,
              repo: state.name!,
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
              _err(err);
            }
          })();
        },
      });
    },
    [app, log],
  );

  /**
   * ブランチを作成
   * fromBranch: 元になるブランチ名
   * newBranch: 作成するブランチ名
   */
  const createBranch = useCallback(
    async (fromBranch: string, newBranch: string) => {
      dispatch({
        type: 'createBranch',
        func: (state: RepositoryState) => {
          (async () => {
            const repositoryId = state.id;

            // 元ブランチの最新コミットのIDを取得する
            const queryResult = await app.state.gqlclient?.query({
              query: gql`
                query GetCommitID(
                  $owner: String!
                  $name: String!
                  $qualifiedName: String!
                ) {
                  repository(owner: $owner, name: $name) {
                    ref(qualifiedName: $qualifiedName) {
                      target {
                        oid
                      }
                    }
                  }
                }
              `,
              variables: {
                owner: state.owner,
                name: state.name,
                qualifiedName: `refs/heads/${fromBranch}`,
              },
            });
            const commitID = queryResult?.data.repository.ref.target.oid;
            _log('GetCommitID', commitID);
            const result = await app.state.gqlclient?.mutate({
              mutation: gql`
                mutation createRef(
                  $name: String!
                  $oid: GitObjectID!
                  $repositoryId: ID!
                ) {
                  createRef(
                    input: {
                      name: $name # refs/heads/my_new_branch
                      oid: $oid
                      repositoryId: $repositoryId
                    }
                  ) {
                    clientMutationId
                  }
                }
              `,
              variables: {
                name: `refs/heads/${newBranch}`,
                oid: commitID,
                repositoryId,
              },
            });
            if (!result) {
              return;
            }
          })();
        },
      });
    },
    [app.state.gqlclient],
  );

  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = useCallback((file: VFile | null) => {
    dispatch({
      type: 'selectFile',
      func: (state: RepositoryState) => {
        _log('selectFile', state.currentFile, '\n>>>>\n', file);
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
            // _log('createFile action', action.path, action.file);
            var encodedData = Buffer.from('\n', 'utf8').toString('base64');
            // _log('encodedData', encodedData);
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
                  repo: state.name,
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
    [app, log, selectBranch],
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
          _log('selectTree', tree);
          // _log('selectTreeAction');
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
            repo: state.name!,
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
    id: '',
    private: false,
    owner: null,
    repo: null,
    name: '',
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
      createBranch,
    }),
    [createBranch, createFile, selectBranch, selectFile, selectTree, state],
  );

  useEffect(() => {
    _log('init ', repository, branch, file);
    if (!app.state.user || app.state.isPending) {
      return;
    }
    selectRepository(repository, branch, file);
  }, [
    app.state.isPending,
    app.state.user,
    branch,
    file,
    repository,
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
