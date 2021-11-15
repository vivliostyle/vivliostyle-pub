import firebase from "firebase";
import { createContext,useState, useContext, Dispatch, SetStateAction } from "react";

type valueType = {
    text: string|null;
    set: (text:string)=>void;
    timestamp: number;
    commit: (
        session:firebase.firestore.DocumentReference<firebase.firestore.DocumentData> | undefined,
        branch:string|undefined,
        user:firebase.User
        )=>{};
}

const ModifiedTextContext = createContext({} as valueType);

export function useModifiedTextContext(){
    return useContext(ModifiedTextContext);
}

export function ModifiedTextProvider({children}:{children:JSX.Element}){
    const [modifiedText,setModifiedText] = useState<string|null>(null);
    const [timestamp,setTimestamp] = useState<number>(0);

    const set = (text:string)=>{
        setModifiedText(text);
        setTimestamp(new Date().getTime());
    }

    const commit = async (
        session:firebase.firestore.DocumentReference<firebase.firestore.DocumentData> | undefined,
        branch:string|undefined,
        user:firebase.User) => {
        if(session && modifiedText != null){
            // console.log('update begin',modifiedText);
            await session.update({
              userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              text: modifiedText,
              state: 'update',
            });
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