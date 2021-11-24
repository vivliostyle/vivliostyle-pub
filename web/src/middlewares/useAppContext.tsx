import React, { createContext, Dispatch, useContext, useEffect, useReducer, useState } from "react";
import firebase from '@services/firebase';
import { onAuthStateChanged, User,getAuth, signInWithRedirect, GithubAuthProvider } from "@firebase/auth";
import * as UI from '@components/ui';
import {Header} from '@components/Header';
import { AppCacheFs } from "./AppCacheFS";
import { Theme, ThemeManager } from "theme-manager";


const provider = new GithubAuthProvider();

export type AppContext = {
    user:User|null;
    isPending:boolean; // ユーザ情報の取得待ちフラグ true:取得待ち false:結果を取得済み
    signIn:()=>void;
    signOut:()=>void;
    onlineThemes:Theme[];
    vpubFs?:AppCacheFs;
    // TODO: リポジトリのリストを持つ
}

type Actions = 
| { type:'init'; user:User|null; fs?:AppCacheFs; themes?:Theme[] };

const AppContext = createContext({} as AppContext);

export function useAppContext() {
    return useContext(AppContext);
}

/**
 * 
 * @param param0 
 * @returns 
 */
export function AppContextProvider({children}:{children:JSX.Element}){

    /**
     * 初期化
     */
    useEffect(()=>{
        const auth = getAuth(firebase);
        const unsubscriber = onAuthStateChanged(auth,user => {
            if(user) {
                (async ()=>{
                    // ユーザアカウントの初期化
                    user.getIdToken(true);
                    // console.log('providerData', user.providerData);
                    await user.getIdTokenResult(true);

                    // Application CacheへのI/O
                    const fs = await AppCacheFs.open();

                    // オンラインテーマの取得
                    // const GitHubAccessToken: string | null = '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';
                    // const themeManagerConfig = {
                    // GitHubAccessToken: GitHubAccessToken
                    // };
                    // const themeManager = new ThemeManager(themeManagerConfig);
                    // const themes = await themeManager.searchFromNpm();
                    const themes:Theme[] = [];
                    dispatch({type:"init", user, fs, themes});
                })();
            }
        });
        return () => unsubscriber();
    },[]);

    /**
     * 
     */
    const signIn = ()=>{
        const auth = getAuth(firebase);
        signInWithRedirect(auth, provider);
    };
    /**
     * 
     */
    const signOut = ()=>{
        (async()=>{
            const auth = getAuth(firebase);
            await auth.signOut();
            dispatch({type:'init',user:null});
        })();            
    }; 

    /**
     * 初期値
     */
    const [state] = useState<AppContext>({
        user: null,
        isPending: true,
        signIn: signIn,
        signOut: signOut,
        onlineThemes: []
    });
    
    /**
     * 
     */
    const reducer = (state: AppContext, action:Actions):AppContext => {
        switch(action.type) {
            case 'init':
                if(action.user === null) {
                    state.vpubFs?.delete();
                }
                return {...state,user:action.user,isPending:false,vpubFs:action.fs,onlineThemes:action.themes??[]};
        }
    }

    const [app, dispatch] = useReducer(reducer, state);

    return app.isPending ? (
        <UI.Container mt={6}>
          <UI.Text>Loading Vivliostyle Editor...</UI.Text>
        </UI.Container>
      ):(
        <AppContext.Provider value={app}>
            <UI.Box>
            <Header />
            {children}
            </UI.Box>
        </AppContext.Provider>
    );
}