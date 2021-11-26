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
import {AppCacheFs} from './AppCacheFS';
import {Theme, ThemeManager} from 'theme-manager';
import {
  ApolloClient,
  ApolloQueryResult,
  DocumentNode,
  gql,
  InMemoryCache,
  NetworkStatus,
  OperationVariables,
  TypedDocumentNode,
} from '@apollo/client';
import {Repository} from './useRepositoryContext';

// GraphQLでサーバに問合せをするためのメソッドの型
type GraphQlQueryMethod = (
  query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
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
  reload: ()=>void;
};

type Actions = {
  type: 'init';
  user: User | null;
  fs?: AppCacheFs;
  themes?: Theme[];
  query?: GraphQlQueryMethod;
  repositories?: Repository[];
} 
| {type: 'reload'};

const AppContext = createContext({} as AppContext);

export function useAppContext() {
  return useContext(AppContext);
}

/**
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
      return;
    }
    (async () => {
      // ユーザアカウントの初期化
      user.getIdToken(true);
      // console.log('providerData', user.providerData);
      await user.getIdTokenResult(true);

      // Application CacheへのI/O
      const fs = await AppCacheFs.open();
      // GraphQLのクエリメソッド
      const client = new ApolloClient({
        uri: '/api/graphql',
        cache: new InMemoryCache(),
        headers: {
          'x-id-token': await user!.getIdToken(),
        },
      });
      const query = async (
        query: DocumentNode | TypedDocumentNode<any, OperationVariables>,
      ): Promise<ApolloQueryResult<any>> => {
        return client.query({query});
      };

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
      console.log('repositories\n', repositories);
      const themes: Theme[] = []; //result.data.themes;

      // オンラインテーマの取得
      // const GitHubAccessToken: string | null = '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';
      // const themeManagerConfig = {
      // GitHubAccessToken: GitHubAccessToken
      // };
      // const themeManager = new ThemeManager(themeManagerConfig);
      // const themes = await themeManager.searchFromNpm();
      //   const themes: Theme[] = [];
      dispatch({type: 'init', user, fs, themes, repositories, query});
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
   *
   */
  const signIn = () => {
    const auth = getAuth(firebase);
    signInWithRedirect(auth, provider);
  };
  /**
   *
   */
  const signOut = () => {
    (async () => {
      const auth = getAuth(firebase);
      await auth.signOut();
      dispatch({type: 'init', user: null});
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
    reload: ()=>{dispatch({type:'reload'})}
  });

  /**
   *
   */
  const reducer = (state: AppContext, action: Actions): AppContext => {
    switch (action.type) {
      case 'init':
        if (action.user === null) {
          // Sign out
          state.vpubFs?.delete();
        }
        return {
          ...state,
          user: action.user,
          isPending: false,
          vpubFs: action.fs,
          onlineThemes: action.themes ?? [],
          query: action.query,
          repositories: action.repositories,
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
