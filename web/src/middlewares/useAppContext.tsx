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
import { Fs, Theme, ThemeManager } from 'theme-manager';
import { Octokit } from '@octokit/rest';
import { Dirent } from 'fs-extra';

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
| {type: 'notSignedIn'}
| {type: 'signOut'}
| {type: 'reload'};

const AppContext = createContext({} as AppContext);

export function useAppContext() {
  return useContext(AppContext);
}

class npmFs implements Fs {
  private owner:string;
  private repo:string;
  private branch:string;
  private dir:string;

  private constructor(owner:string,repo:string,dir:string){
    console.log('constructor:',owner,repo,dir);
    this.owner = owner;
    this.repo = repo;
    this.branch = 'master';
    this.dir = dir;
  }

  /**
   * リポジトリにアクセスするオブジェクトを作成する
   * @param themeLocation テーマ名
   * @returns テーマの場所がアクセス可能ならFsオブジェクトを返す。アクセスできない場合はfalseを返す
   */
  public static async open(themeLocation:any):Promise<Fs|false> {
    // themeLocationからowner,repoを取得する
    // console.log('npm open:',themeLocation);
    const pkg = themeLocation.package;
    if(!pkg || pkg.scope !== 'vivliostyle' || !pkg.links.repository) { console.log('pkg cant open',pkg.scope); return false; } // GitHubにある公式テーマのみ対応

    const name = pkg.name;
    const repoUrl = pkg.links.repository;
    console.log('npm open :', name, repoUrl);


    const owner = 'vivliostyle';
    const repo = 'themes';
    const branch = 'master';
    const dir = pkg.name;
    const fs = new npmFs(owner,repo,dir);

    return fs;
  }

  public async readFile(path: string, json?: boolean | undefined):Promise<string | Buffer> {
    // TODO: GraphQLにしたいけれど、GitHub App以外のトークンが必要っぽい
    // octokit-restはPublic repositoryへのアクセスはトークン不要
    console.log('readFile',path);
    const octokit = new Octokit();
    // TODO: Monorepoではない公式テーマはどうする?
    const repoPath = `packages/${this.dir}/${path}`;
    console.log('repoPath',repoPath);
    const content = await octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: repoPath
    });
    if(!('content' in content.data && 'encoding' in content.data)) { throw new Error(); }
    const buffer = Buffer.from(content.data.content, content.data.encoding as BufferEncoding);
    const data = buffer.toString();
    // console.log('readFile content',data);
    return json ? JSON.parse(data) : data;
  }

  public async writeFile(file: string | Buffer | URL, data: string | Object | Buffer | DataView, options?: string | Object | undefined):Promise<void> {
    throw new Error('not implemnted');
    return;
  }

  public async readdir(path: string, options?: string | Object | undefined):Promise<Dirent[]>{
    throw new Error('not implemnted');
    return [];
  }
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
      searchOrder:[
        async (themeLocation:any)=>{ return await npmFs.open(themeLocation); }
      ]
    };
    const themeManager = new ThemeManager(themeManagerConfig);
    const themes = await themeManager.searchFromNpm();
    return themes;
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
    if (!user) { dispatch({type:'notSignedIn'}); return;}
    (async () => {
      console.log('init',1);
      // ユーザアカウントの初期化
      user.getIdToken(true);
      // console.log('providerData', user.providerData);
      await user.getIdTokenResult(true);
      console.log('init',2);

      // Application CacheへのI/O
      const fs = await AppCacheFs.open();
      console.log('init',3);

      // リポジトリリストの取得
      // GraphQLのクエリメソッド
      const client = new ApolloClient({
        uri: '/api/graphql',
        cache: new InMemoryCache(),
        headers: {
          'x-id-token': await user!.getIdToken(),
        },
      });
      console.log('init',4);

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
      console.log('init',5);
      const repositories: Repository[] = result.data.repositories;
      console.log('repositories\n', repositories);
      // テーマ一覧を取得
      console.log('init',6);
      const themes: Theme[] = await getOfficialThemes();
      console.log('themes', themes);
      // 
      console.log('init',7);
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
    reload: ()=>{dispatch({type:'reload'})}
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
          repositories: action.repositories,
        };
      case 'notSignedIn':
        // サインインしていない
        return {...state, isPending: false}
      case 'signOut':
        state.vpubFs?.delete().then(()=>{});
        return {...state,user:null,query:undefined,repositories:undefined};
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
