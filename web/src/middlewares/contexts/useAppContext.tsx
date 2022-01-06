import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
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
  NetworkStatus,
  NormalizedCacheObject,
  OperationVariables,
  TypedDocumentNode,
} from '@apollo/client';
import {Repository} from './useRepositoryContext';
import {Theme, ThemeManager} from 'theme-manager';
import {NpmFs} from '../fs/NpmFS';

// GraphQLでサーバに問合せをするためのメソッドの型
type GraphQlQueryMethod = (
  query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
  aptions: OperationVariables
) => Promise<ApolloQueryResult<any>>;

const provider = new GithubAuthProvider();

export type AppContext = {
  user: User | null;
  isPending: boolean; // ユーザ情報の取得待ちフラグ true:取得待ち false:結果を取得済み
  signIn: () => void;
  signOut: () => void;
  onlineThemes: Theme[];
  vpubFs?: AppCacheFs; // Application Cacheへのアクセス
  repositories?: Repository[] | null; // ユーザがアクセス可能(vivliostyle-pub Appが許可されている)なリポジトリのリスト
  query?: GraphQlQueryMethod; // サーバのGraphQL APIへのクエリメソッド
  gqlclient?: ApolloClient<NormalizedCacheObject>;
  reload: () => void;
};

type Actions =
  | {
      type: 'init';
      user: User | null;
      fs?: AppCacheFs;
      themes?: Theme[];
      query?: GraphQlQueryMethod;
      gqlclient?: ApolloClient<NormalizedCacheObject>;
      repositories?: Repository[];
    }
  | {type: 'notSignedIn'}
  | {type: 'signOut'}
  | {type: 'reload'};

const AppContext = createContext({} as AppContext);

export function useAppContext() {
  return useContext(AppContext);
}

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
): Promise<Repository[]> {
  try {
    // リポジトリリストの取得
    const result = await query(
      gql`
        query {
          repositories {
            id
            node_id
            private
            full_name
            owner
            repo
            branches
            defaultBranch
          }
        }
      `,
    );
    const repositories: Repository[] = result.data.repositories;
    return repositories;
  } catch (error) {
    return [];
  }
}

/**
 * アプリケーションコンテクスト
 *
 * @param param0
 * @returns
 */
export function AppContextProvider({children}: {children: JSX.Element}) {
  /**
   * ユーザがサインインしている場合の初期化処理
   * @param user
   * @returns
   */
  const init = (user: User | null) => {
    console.log('init', user);
    if (!user) {
      dispatch({type: 'notSignedIn'});
      return;
    }
    (async () => {
      console.log('init', 1);
      // ユーザアカウントの初期化
      user.getIdToken(true);
      // console.log('providerData', user.providerData);
      await user.getIdTokenResult(true);
      console.log('init', 2);

      // Application CacheへのI/O
      const fs = await AppCacheFs.open();
      // GraphQLのクエリメソッド
      const idToken = await user!.getIdToken();
      const client = new ApolloClient({
        uri: '/api/graphql',
        cache: new InMemoryCache(),
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
      console.log('repositories\n', repositories);

      // テーマ一覧を取得
      console.log('init', 3);
      const themes: Theme[] = await getOfficialThemes();
      console.log('themes', themes);
      //
      console.log('init', 4);
      dispatch({type: 'init', user, fs, themes, repositories, query, gqlclient:client});
    })();
  };
  /**
   * 初期化
   */
  useEffect(() => {
    const auth = getAuth(firebase);
    const unsubscriber = onAuthStateChanged(auth, (user) => init(user));
    return () => unsubscriber();
  }, []);

  /**
   * サインイン
   */
  const signIn = () => {
    const auth = getAuth(firebase);
    signInWithRedirect(auth, provider);
  };
  /**
   * サインアウト
   */
  const signOut = () => {
    (async () => {
      const auth = getAuth(firebase);
      await auth.signOut();
      dispatch({type: 'signOut'});
    })();
  };

  const reload = () => {};

  /**
   * 初期値
   */
  const [state] = useState<AppContext>({
    user: null,
    isPending: true,
    signIn: signIn,
    signOut: signOut,
    onlineThemes: [],
    query: async (
      query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
    ): Promise<ApolloQueryResult<any>> => {
      return {data: null, loading: false, networkStatus: NetworkStatus.ready};
    },
    repositories: null,
    reload: () => {
      dispatch({type: 'reload'});
    },
  });

  /**
   *
   */
  const reducer = (state: AppContext, action: Actions): AppContext => {
    switch (action.type) {
      case 'init':
        return {
          ...state,
          user: action.user,
          isPending: false,
          vpubFs: action.fs,
          onlineThemes: action.themes ?? [],
          query: action.query,
          gqlclient: action.gqlclient,
          repositories: action.repositories,
        };
      case 'notSignedIn':
        // サインインしていない
        return {...state, isPending: false};
      case 'signOut':
        // ApplicationCacheを削除
        state.vpubFs?.unlinkCache().then(() => {});
        return {
          ...state,
          user: null,
          query: undefined,
          repositories: undefined,
        };
      case 'reload':
        init(state.user);
        return state;
    }
  };

  const [app, dispatch] = useReducer(reducer, state);

  return app.isPending ? (
    <UI.Container mt={6}>
      <UI.Text>Loading Vivliostyle Editor...</UI.Text>
    </UI.Container>
  ) : (
    <AppContext.Provider value={app}>
      <UI.Box>
        <Header />
        {children}
      </UI.Box>
    </AppContext.Provider>
  );
}
