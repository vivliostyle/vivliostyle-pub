import {createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useReducer, useState} from 'react';

type LogEntry = {
  key:string;
  timestamp: number;
  type: "info"|"error"|"success"|"warning";
  message: string;
};

type Log = {
  info: (message: string) => void;
  error: (message: string) => void;
};

// type LogBuffer = {
//   entries: LogEntry[];
// }

type Actions = {type: 'logging'; entry: LogEntry; entries: LogEntry[]; setBuf:Dispatch<SetStateAction<LogEntry[]>> };
// type BufActions = {type: 'logging'; entry: LogEntry};

const LogContext = createContext({} as Log);
const LogBufferContext = createContext([] as LogEntry[]);

/**
 * Logを追加したいコンポーネントで呼び出すこと
 * @returns LogContextオブジェクト
 */
export function useLogContext() {
  return useContext(LogContext);
}

/**
 * Logを読み込みたいコンポーネントで呼び出すこと
 * @returns 
 */
export function useLogBufferContext() {
  return useContext(LogBufferContext);
}

const reducer = (state: Log, action: Actions): Log => {
  switch (action.type) {
    case 'logging':
      console.log('logging');
      action.entries.unshift(action.entry);
      action.setBuf(action.entries);
      return {...state}; //{...state, entries: [action.entry, ...state.entries]};
    }
}

export function LogContextProvider({children}: {children: JSX.Element}) {
  const [buf,setBuf] = useState<LogEntry[]>([]);
  console.log('relroad buf',buf);

  const createEntry = useCallback((type: "info"|"error"|"success"|"warning", message: string): LogEntry => {
    const key = Math.random()+"";
    return {key, type, message, timestamp: Date.now()};
  },[]);

  const info = useCallback((message: string) => {
    const entry = createEntry('info', message);
    console.log('error buf',buf);
    dispatch({type:'logging',entries:buf,entry,setBuf});
  },[buf, createEntry]);

  const error = useCallback( (message: string) => {
    const entry = createEntry('error', message);
    console.log('error buf',buf);
    dispatch({type:'logging',entries:buf,entry,setBuf});
  },[buf, createEntry]);

  const state = {
    info,
    error,
  };
  const [log, dispatch] = useReducer(reducer!, state);

  return (
  <LogContext.Provider value={log}>
    <LogBufferContext.Provider value={buf}>
    {children}
    </LogBufferContext.Provider>
  </LogContext.Provider>);
}
