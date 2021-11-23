import React, { createContext, Dispatch, useContext, useEffect, useReducer, useState } from "react";
import firebase from '@services/firebase';
import { onAuthStateChanged, User,getAuth, signInWithRedirect, GithubAuthProvider } from "@firebase/auth";
import * as UI from '@components/ui';
import {Header} from '@components/Header';
import { AppCacheFs } from "./AppCacheFS";


const provider = new GithubAuthProvider();


export type AppContext = {
    user:User|null;
    isPending:boolean; // ユーザ情報の取得待ちフラグ true:取得待ち false:結果を取得済み
    signIn:()=>void;
    signOut:()=>void;
    vpubFs?:AppCacheFs;
    // TODO: リポジトリのリストを持つ
}

type Actions = 
| { type:'setUser'; user:User|null; fs?:AppCacheFs };

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
     * ユーザ情報の取得
     */
    useEffect(()=>{
        const auth = getAuth(firebase);
        const unsubscriber = onAuthStateChanged(auth,user => {
            if(user) {
                (async ()=>{
                    user.getIdToken(true);
                    // console.log('providerData', user.providerData);
                    await user.getIdTokenResult(true);
                    const fs = await AppCacheFs.open(); 
                    dispatch({type:"setUser", user, fs});
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
            dispatch({type:'setUser',user:null});
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
    });
    
    /**
     * 
     */
    const reducer = (state: AppContext, action:Actions):AppContext => {
        switch(action.type) {
            case 'setUser':
                if(action.user === null) {
                    state.vpubFs?.delete();
                }
                return {...state,user:action.user,isPending:false,vpubFs:action.fs};
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