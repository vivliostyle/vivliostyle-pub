import firebase from "firebase";
import { createContext,useState, useContext, Dispatch, SetStateAction, useReducer } from "react";


export type TYPE_PREVIEW_TARGET = { 
    text:string|null;
    path:string|null;
    changeFile:(path:string|null,text:string|null)=>void;
    modifyText:(text:string|null)=>void;
    commit: (
        session:firebase.firestore.DocumentReference<firebase.firestore.DocumentData> | undefined,
        branch:string|undefined,
        user:firebase.User
    )=>void;
};
  
type ACTION_TYPE = 
    | { type: "changeFile", path:string|null, text:string|null } 
    | { type: "modifyText", text:string|null }
    | { type: "commit"};
  
const PreviewTargetContext = createContext({} as TYPE_PREVIEW_TARGET);

export function usePreviewTargetContext(){
    return useContext(PreviewTargetContext);
}

/**
 * PreviewTargetコンテクストコンポーネント
 * @param param0 
 * @returns 
 */
export function PreviewTargetContextProvider({children}:{children:JSX.Element}){

    /**
     * ファイルをリポジトリにコミットする
     * @param session
     * @param branch 
     * @param user 
     */
    const commit = async (
        session:firebase.firestore.DocumentReference<firebase.firestore.DocumentData> | undefined,
        branch:string|undefined,
        user:firebase.User
    )=>{
    
    };
    /**
     * 対象となるファイルを切り替えた
     * @param path 
     * @param text 
     */
    const changeFile = (path:string|null, text:string|null) => {
        dispatch({type:'changeFile',path:path,text:text});
    }
    /**
     * テキストを更新する
     * @param text 
     */
    const modifyText = (text:string|null) => {
        dispatch({type:'modifyText',text:text});
    }

    /**
     * 
     */
    const [state] = useState<TYPE_PREVIEW_TARGET>({
        text:null,
        path:null,
        changeFile: changeFile,
        modifyText: modifyText,
        commit: commit
    });

    /**
     * 
     * @param state 
     * @param action 
     * @returns 
     */
    const reducer = (state:TYPE_PREVIEW_TARGET, action:ACTION_TYPE):TYPE_PREVIEW_TARGET => {
        switch (action.type) {
          case 'changeFile':
            return {...state, path: action.path!.replace(/\.md$/, '.html'), text: action.text};
          case 'modifyText':
            return {...state, text: action.text};
          case 'commit':
            return state;
        }
    }
    const [previewTarget, dispatch] = useReducer(reducer, state);

    return (
        <PreviewTargetContext.Provider value={previewTarget}>
        {children}
        </PreviewTargetContext.Provider>
    );
}