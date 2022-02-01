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
import {Log, useLogContext} from './useLogContext';
import {CoreProps} from '../vivliostyle.config';
import {WebApiFs} from '../fs/WebApiFS';
import {gql} from '@apollo/client';
import upath from 'upath';
import {t} from 'i18next';

export type Repository = {
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
  fs: WebApiFs | null;
  // メソッド
  selectBranch: (branch: string) => void;
  selectTree: (tree: '.' | '..' | VFile) => void; // .は現在のディレクトリのリロード用
  selectFile: (path: VFile | null) => void;
  createFile: (path: string, file: File) => void; // JavaScript標準のFile TODO: VFileにできればする
};

const RepositoryContext = createContext({} as Repository);

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}

/**
 * useReducer用のAction定義
 */
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
  | {
      type: 'selectBranchCallback';
      branch: string;
      files: VFile[];
      tree?: VFile[];
      log: Log;
    }
  | {type: 'selectTree'; func:(state:Repository)=>void}
  | {type: 'selectTreeCallback'; tree: VFile[]; files: VFile[]};

/**
 * クエリパラメータのfile属性にファイルパスをセットする
 * @param file
 */
function setQueryParam(attr:string,value: string|null) {
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
const reducer = (state: Repository, action: Actions): Repository => {
  switch (action.type) {
    case 'selectRepositoryCallback':
      setQueryParam('branch',action.branch);
      setQueryParam('file',null);
      return {
        ...state,
        owner: action.owner,
        repo: action.repo,
        branches: action.branches,
        defaultBranch: action.defaultBranch,
        branch: action.branch,
        files: action.files,
      };
    case 'selectBranchCallback':
      // TODO: ブランチ毎のカレントディレクトリを保持する
      // クエリパラメータにブランチをセットする
      setQueryParam('branch',action.branch);
      setQueryParam('file',null);
      action.log.info(
        t('ブランチを変更しました', {branch: action.branch}),
        1000,
      );
      return {
        ...state,
        branch: action.branch,
        currentTree: action.tree ?? [],
        files: action.files,
      };
    case 'selectTree':
      action.func(state);
      return state;
    case 'selectTreeCallback':
      return {...state, currentTree: action.tree, files: action.files};
  }
};

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
  console.log('[repositoryContext]', owner, repo);
  const log = useLogContext();
  const app = useAppContext();
  const [currentFile, setCurrentFile] = useState<VFile | null>(null);

  /**
   * リポジトリを選択する
   */
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
        branch = branch ?? defaultBranch;
        const props = {
          user: app.user!,
          owner,
          repo,
          branch,
        };
        console.log('selectRepository', props);
        const fs: WebApiFs = await WebApiFs.open(props);
        const dirname = filePath ? upath.dirname(filePath) : '';
        const files = await fs.readdir(dirname);
        let file;
        if (filePath) {
          const name = upath.basename(filePath);
          file = new VFile({fs, dirname, type: 'file', name});
        }
        if (file) {
          setCurrentFile(file);
        }
        if (dispatch) {
          dispatch({
            type: 'selectRepositoryCallback',
            owner,
            repo,
            branches,
            defaultBranch,
            branch,
            files,
            file,
          });
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.isPending, app.user],
  );

  /**
   * ブランチの選択
   * @param branch
   */
  const selectBranch = useCallback(
    (newBranch: string) => {
      console.log('selectBranch', newBranch);
      if (!owner || !repo || !newBranch || branch === newBranch) {
        return;
      }
      (async () => {
        const props = {
          user: app.user!,
          owner: owner!,
          repo: repo!,
          branch: newBranch,
        };
        // ブランチ変更の際にはルートディレクトリをカレントディレクトリにする
        const dirname = '';
        try {
          const fs = await WebApiFs.open(props);
          const files = await fs.readdir(dirname);
          if (dispatch) {
            setCurrentFile(null);

            dispatch({
              type: 'selectBranchCallback',
              branch: newBranch,
              files,
              log,
            });
          }
        } catch (err: any) {
          console.error(err);
        }
      })();
    },
    [owner, repo],
  );

  /**
   * 編集対象のファイルを選択する
   * @param path
   */
  const selectFile = useCallback((file: VFile | null) => {
    console.log('useRepositoryContext selectFile', file);
    setCurrentFile(file);
  }, []);

  /**
   * ファイルを新しく作成する
   */
  const createFile = useCallback((path: string, file: File) => {
    (async () => {
      // console.log('createFile action', action.path, action.file);
      var encodedData = Buffer.from('\n', 'utf8').toString('base64');
      // console.log('encodedData', encodedData);
      try {
        const result = await app.gqlclient?.mutate({
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
            owner,
            repo,
            branch: branch,
            path: path,
            encodedData,
            message: 'create file',
          },
        });
        if (!result) {
          return;
        }
        if (result.data.commitContent.state) {
          log.success(t('ファイルを作成しました', {filepath: path}), 1000);
          // ファイルリストを更新する
          // TODO: mutationの結果として取得することでリクエスト回数を減らす
          if (branch) {
            selectBranch(branch);
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
  }, []);

  /**
   * フォルダを開く
   * @param tree
   */
  const selectTree = useCallback((tree: '.' | '..' | VFile) => {
    // stateが必要な処理と非同期処理が不可分な場合に
    // useReducerで無理矢理に非同期処理を実行する
    dispatch({type:"selectTree",func:(state:Repository)=>{
      (async () => {
        console.log('selectTree', tree);
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
          user: app.user!,
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
    }});
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
    // currentFile: null,
    currentConfig: null,
    fs: null,
    defaultBranch: '',
    // メソッド
    selectBranch,
    selectTree,
    selectFile,
    createFile,
  } as Repository;

  const [repository, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!app.user || app.isPending) {
      return;
    }
    selectRepository(owner, repo, branch, file);
  }, [app.isPending, app.user, branch, file, owner, repo, selectRepository]);

  /*
    1. currentFileが変更される
    2. CurrentFileContextProvider内でファイルコンテントの読み込みなどを行なう
    3. onReadyイベントハンドラで変更がRepositoContextProviderに通知される
    4. repository.currentFileが変更される
    5. 購読者に変更通知
  */
  return (
    <RepositoryContext.Provider value={repository}>
      <CurrentFileContextProvider file={currentFile}>
        {children}
      </CurrentFileContextProvider>
    </RepositoryContext.Provider>
  );
}
