import React, { createContext, Dispatch, useContext, useEffect, useReducer, useState } from "react";
import firebase from '@services/firebase';
import { onAuthStateChanged, User,getAuth, signInWithRedirect, GithubAuthProvider } from "@firebase/auth";
import * as UI from '@components/ui';
import {Header} from '@components/Header';


const provider = new GithubAuthProvider();


export type AppContext = {
    user:User|null;
    isPending:boolean; // ユーザ情報の取得待ちフラグ true:取得待ち false:結果を取得済み
    signIn:()=>void;
    signOut:()=>void;

    // TODO: リポジトリのリストを持つ
}

type Actions = 
| { type:'setUser'; user:User|null; };

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

    let dispatcher: Dispatch<Actions> | undefined;

    /**
     * ユーザ情報の取得
     */
    useEffect(()=>{
        const auth = getAuth(firebase);
        const unsubscriber = onAuthStateChanged(auth,user => {
            if(user) {
                user.getIdToken(true);
                // console.log('providerData', user.providerData);
                user.getIdTokenResult(true).then((data) => {
                    // console.log('idTokenResult',data);
                    if(dispatcher){
                        dispatcher({type:"setUser",user});      
                    }
                }).catch((error)=>{
                    console.error(error);
                });
            }
        });
        return () => unsubscriber();
    },[dispatcher]);

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
        const auth = getAuth(firebase);
        auth.signOut()
        .then(()=>{
            if(dispatcher){
                console.log('signOut');
                dispatcher({type:'setUser',user:null});
            }
        })
        .catch((e)=>{
            console.error(e);
        });
    }; 

    /**
     * 初期値
     */
    const [state] = useState<AppContext>({
        user: null,
        isPending: true,
        signIn: signIn,
        signOut: signOut
    });
    
    /**
     * 
     */
    const reducer = (state: AppContext, action:Actions):AppContext => {
        switch(action.type) {
            case 'setUser':
                return {...state,user:action.user,isPending:false};
        }
    }

    const [app, dispatch] = useReducer(reducer, state);
    useEffect(()=>{
        // eslint-disable-next-line react-hooks/exhaustive-deps
        dispatcher = dispatch;
    },[dispatch]);

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