import {createContext, useContext, useReducer} from 'react';

type LogEntry = {
  timestamp: number;
  type: "info"|"error"|"success"|"warning";
  message: string;
};

type Log = {
  info: (message: string) => void;
  error: (message: string) => void;
  entries: LogEntry[];
};

type Actions = {type: 'logging'; entry: LogEntry};

const LogContext = createContext({} as Log);

/**
 * LogContextを使用したいコンポーネントで呼び出すこと
 * @returns LogContextオブジェクト
 */
export function useLogContext() {
  return useContext(LogContext);
}

export function LogContextProvider({children}: {children: JSX.Element}) {
  const createEntry = (type: string, message: string): LogEntry => {
    return {type, message, timestamp: Date.now()};
  };

  const info = (message: string) => {
    if (dispatch) {
      dispatch({type: 'logging', entry: createEntry('info', message)});
    }
  };

  const error = (message: string) => {
    if (dispatch) {
      dispatch({type: 'logging', entry: createEntry('error', message)});
    }
  };

  const state = {
    info,
    error,
    entries: [],
  };

  const reducer = (state: Log, action: Actions): Log => {
    switch (action.type) {
      case 'logging':
        return {...state, entries: [action.entry, ...state.entries]};
    }
  };

  const [log, dispatch] = useReducer(reducer, state);

  return <LogContext.Provider value={log}>{children}</LogContext.Provider>;
}
