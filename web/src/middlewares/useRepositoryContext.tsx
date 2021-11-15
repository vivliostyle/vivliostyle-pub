import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

type ContextType = {
    owner:string|null;
    setOwner:Dispatch<SetStateAction<string | null>>;
    repo:string|null;
    setRepo:Dispatch<SetStateAction<string | null>>;
    branch:string|null;
    setBranch:Dispatch<SetStateAction<string | null>>;
}

const RepositoryContext = createContext({} as ContextType);

export function useRepositoryContext(){
    return useContext(RepositoryContext);
}

export function RepositoryContextProvider({children}:{children:JSX.Element}){
    const [owner,setOwner] = useState<string|null>(null);
    const [repo, setRepo] = useState<string|null>(null);
    const [branch, setBranch] = useState<string|null>(null);

    const value = {
        owner,
        setOwner,
        repo,
        setRepo,
        branch,
        setBranch
    }

    return (
        <RepositoryContext.Provider value={value}>
        {children}
        </RepositoryContext.Provider>
    );
}