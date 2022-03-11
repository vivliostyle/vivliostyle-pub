import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import firebase from '@services/firebase';
import {
  onAuthStateChanged,
  User,
  getAuth,
  signInWithRedirect,
  GithubAuthProvider,
} from '@firebase/auth';
import * as UI from '@components/ui';
import {Header} from '@components/Header';
import {AppCacheFs} from '../fs/AppCacheFS';

import {
  ApolloClient,
  ApolloQueryResult,
  DocumentNode,
  gql,
  InMemoryCache,
  NormalizedCacheObject,
  OperationVariables,
  TypedDocumentNode,
} from '@apollo/client';
import {RepositoryState} from './useRepositoryContext';
import {Theme, ThemeManager} from 'theme-manager';
import {NpmFs} from '../fs/NpmFS';
import {devConsole} from '@middlewares/frontendFunctions';
import {useLogContext} from './useLogContext';
import {t} from 'i18next';

const {_log, _err} = devConsole('[useAppContext]');

// GraphQLでサーバに問合せをするためのメソッドの型
type GraphQlQueryMethod = (
  query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
  options: OperationVariables,
) => Promise<ApolloQueryResult<any>>;

const provider = new GithubAuthProvider();

type AppContextState = {
  user: User | null;
  isPending: boolean; // ユーザ情報の取得待ちフラグ true:取得待ち false:結果を取得済み
  onlineThemes: Theme[];
  vpubFs?: AppCacheFs; // Application Cacheへのアクセス
  repositories?: RepositoryState[] | null; // ユーザがアクセス可能(vivliostyle-pub Appが許可されている)なリポジトリのリスト
  gqlclient?: ApolloClient<NormalizedCacheObject>;
};

/**
 * AppContextで管理する状態オブジェクトの型定義
 */
export type AppContext = {
  state: AppContextState;
  reload: () => void;
  signIn: () => void;
  signOut: () => void;
  clearCache: () => void;
  removeAccount: () => void;
};

/**
 * React Context
 */
const AppContext = createContext({} as AppContext);

export function useAppContext() {
  return useContext(AppContext);
}

/**
 * useReducer用のAction定義
 */
type Actions =
  | {
      type: 'initCallback';
      user: User | null;
      fs?: AppCacheFs;
      themes?: Theme[];
      query?: GraphQlQueryMethod;
      gqlclient?: ApolloClient<NormalizedCacheObject>;
      repositories?: RepositoryState[];
    }
  | {type: 'notSignedIn'}
  | {type: 'signOut'; func: (state: AppContextState) => void}
  | {type: 'signOutCallback'}
  | {type: 'clearCache'}
  | {type: 'reload'; func: (state: AppContextState) => void}
  | {type: 'removeAccount'; func: (state: AppContextState) => void};

/**
 * 公式テーマのリストを返す
 * @param parent
 * @param args
 * @param context token,rolesが含まれたオブジェクト
 * @param info
 * @returns
 */
async function getOfficialThemes() {
  // オンラインテーマの取得
  const themeManagerConfig = {
    searchOrder: [
      async (themeLocation: any) => {
        return await NpmFs.open(themeLocation);
      },
    ],
  };
  _log('themeManageConfig', themeManagerConfig);
  const themeManager = new ThemeManager(themeManagerConfig);
  const themes = await themeManager.searchFromNpm();
  return themes;
}

/**
 * ログインしているユーザがアクセス可能なリポジトリのリストを取得する
 * アクセス可能なリポジトリはGitHub Appがインストールされていて許可しているリポジトリ
 * @param query
 * @returns
 */
async function getRepositories(
  query: (
    query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
  ) => Promise<ApolloQueryResult<any>>,
): Promise<RepositoryState[]> {
  try {
    // リポジトリリストの取得
    const result = await query(
      gql`
        query {
          repositories {
            id
            name
            owner {
              __typename
              login
            }
            defaultBranchRef {
              id
              name
            }
            isPrivate
            refs(first: 100, refPrefix: "refs/heads") {
              nodes {
                name
              }
            }
          }
        }
      `,
    );
    const repositories: RepositoryState[] = await result.data.repositories.map(
      (r: any) => {
        // _log('r', r);
        return {
          id: r.id,
          private: r.isPrivate,
          owner: r.owner.login,
          name: r.name,
          // branch: null,
          // currentConfig: null,
          // currentTree:null,
          branches: r.refs.nodes.flat().map((node: any) => node.name),
          defaultBranch: r.defaultBranchRef ? r.defaultBranchRef.name : '', // ブランチが存在しない空のリポジトリもありうるため
          // files:[],
          // currentFile: null,
          // fs:null
        };
      },
    );
    _log('repositories', repositories);
    return repositories;
  } catch (error) {
    _err(error);
    return [];
  }
}

/**
 * useReducer用のディスパッチャ定義
 * コンポーネント内でディスパッチャを定義すると更新の度に新しい関数オブジェクトが作られて多重呼び出しになるので注意
 * @param state  現在の状態
 * @param action アクションオブジェクト
 * @returns 新しい状態
 */
const reducer = (state: AppContextState, action: Actions): AppContextState => {
  switch (action.type) {
    case 'initCallback':
      return {
        ...state,
        user: action.user,
        isPending: false,
        vpubFs: action.fs,
        onlineThemes: action.themes ?? [],
        gqlclient: action.gqlclient,
        repositories: action.repositories,
      };
    case 'notSignedIn':
      // サインインしていない
      return {...state, isPending: false};
    case 'signOut':
      action.func(state);
      return state;
    case 'signOutCallback':
      // ApplicationCacheを削除
      return {
        ...state,
        user: null,
        repositories: undefined,
      };
    case 'clearCache':
      // ApplicationCacheを削除
      _log('app clearCache');
      state.vpubFs?.unlinkCache().then(() => {});
      return state;
    case 'reload':
      action.func(state);
      return state;
    case 'removeAccount':
      action.func(state);
      return state;
  }
};

/**
 * アプリケーションコンテクスト
 *
 * @param param0
 * @returns
 */
export function AppContextProvider({children}: {children: JSX.Element}) {
  const log = useLogContext();

  // _log('');
  /**
   * ユーザがサインインしている場合の初期化処理
   * @param user
   * @returns
   */
  const init = useCallback((user: User | null) => {
    _log('app init', user);
    if (!user) {
      dispatch({type: 'notSignedIn'});
      return;
    }
    (async () => {
      // ユーザアカウントの初期化
      user.getIdToken(true);
      // _log('providerData', user.providerData);
      await user.getIdTokenResult(true);

      // Application CacheへのI/O
      const fs = await AppCacheFs.open();
      // GraphQLのクエリメソッド
      const idToken = await user!.getIdToken();
      const client = new ApolloClient({
        uri: '/api/graphql',
        cache: new InMemoryCache({
          // 同種のオブジェクトをキャッシュする際のIDとなるフィールドを指定
          typePolicies: {
            Repository: {
              keyFields: ['owner', 'name'],
            },
            Tree: {
              keyFields: ['oid'],
            },
          },
        }),
        headers: {
          'x-id-token': idToken,
        },
      });
      const query = async (
        query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
      ): Promise<ApolloQueryResult<any>> => {
        return client.query({query});
      };
      const repositories = await getRepositories(query);

      // テーマ一覧を取得
      const themes: Theme[] = await getOfficialThemes();
      _log('themes', themes);
      //
      dispatch({
        type: 'initCallback',
        user,
        fs,
        themes,
        repositories,
        gqlclient: client,
      });
    })();
  }, []);

  /**
   * 初期化
   */
  useEffect(() => {
    const auth = getAuth(firebase);
    const unsubscriber = onAuthStateChanged(auth, (user) => init(user));
    return () => unsubscriber();
  }, [init]);

  /**
   * サインイン
   */
  const signIn = useCallback(() => {
    const auth = getAuth(firebase);
    signInWithRedirect(auth, provider);
  }, []);
  /**
   * サインアウト
   */
  const signOut = useCallback(() => {
    dispatch({
      type: 'signOut',
      func: (state: AppContextState) => {
        (async () => {
          const auth = getAuth(firebase);
          await auth.signOut();
          await state.vpubFs?.unlinkCache();
          dispatch({type: 'signOutCallback'});
        })();
      },
    });
  }, []);

  /**
   *  リポジトリリストのリロード
   */
  const reload = useCallback(() => {
    _log('reload');
    dispatch({
      type: 'reload',
      func: (state: AppContextState) => {
        init(state.user);
      },
    });
  }, [init]);

  /**
   * アプリケーションキャッシュの削除
   */
  const clearCache = () => {
    dispatch({type: 'clearCache'});
  };

  const removeAccount = useCallback(() => {
    _log('removeAccount');
    dispatch({
      type: 'removeAccount',
      func: async (state: AppContextState): Promise<void> => {
        const result = await state.gqlclient?.mutate({
          mutation: gql`
            mutation removeAccount($id: String!) {
              removeAccount(params: {id: $id}) {
                state
                message
              }
            }
          `,
          variables: {
            id: 'dummy',
          },
        });
        if (result?.data.removeAccount.state) {
          signOut();
        } else {
          log.error(t('ユーザアカウントの削除に失敗しました'), 3000);
        }
      },
    });
  }, []);

  /**
   * 初期値
   */
  const initialState = {
    user: null,
    isPending: true,
    onlineThemes: [],
    repositories: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      state,
      reload,
      signIn,
      signOut,
      clearCache,
      removeAccount,
    }),
    [reload, signIn, signOut, state, removeAccount],
  );

  if (state.isPending) {
    return (
      <UI.Container mt={6}>
        <UI.Text>Loading Vivliostyle Editor...</UI.Text>
      </UI.Container>
    );
  } else {
    return (
      <AppContext.Provider value={value}>
        <UI.Box>
          <Header />
          {children}
        </UI.Box>
      </AppContext.Provider>
    );
  }
}
