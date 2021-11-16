// import firebase from "firebase";
//import admin from 'firebase';

import firebase from "@services/firebase";
import { User } from "firebase/auth";
import { DocumentData, DocumentReference } from "firebase/firestore";
import { createContext,useState, useContext, Dispatch, SetStateAction } from "react";

type valueType = {
    path: string|null;
    text: string|null;
    set: (text:string,path:string)=>void;
    timestamp: number;
    commit: (
        session:DocumentReference<DocumentData> | undefined,
        branch:string|undefined,
        user:User
    )=>{};
}

const ModifiedTextContext = createContext({} as valueType);

export function useModifiedTextContext(){
    return useContext(ModifiedTextContext);
}

export function ModifiedTextProvider({children}:{children:JSX.Element}){
    const [path,setPath] = useState<string|null>(null);
    const [modifiedText,setModifiedText] = useState<string|null>(null);
    const [timestamp,setTimestamp] = useState<number>(0);

    const set = (text:string,path:string)=>{
        path=path.replace(/\.md$/, '.html');
        setPath(path);
        setModifiedText(text);
        setTimestamp(new Date().getTime());
    }

    const commit = async (
        session:DocumentReference<DocumentData> | undefined,
        branch:string|undefined,
        user:User) => {
        if(session && modifiedText != null){
            // console.log('update begin',modifiedText);
            // await session.update({
            //   userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            //   text: modifiedText,
            //   state: 'commit',
            // });
            // console.log('update end');
            await fetch('/api/github/commitSession', {
              method: 'PUT',
              body: JSON.stringify({ sessionId: session.id, branch }),
              headers: {
                'content-type': 'application/json',
                'x-id-token': await user.getIdToken(),
              },
            });
        }
    };

    const value = {
        path,
        text:modifiedText,
        set,
        commit,
        timestamp,
    };

    return (
        <ModifiedTextContext.Provider value={value}>
        {children}
        </ModifiedTextContext.Provider>
    );
}