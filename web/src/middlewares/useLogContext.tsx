import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useReducer,
  useState,
} from 'react';

type LogEntry = {
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
};

type Log = {
  info: (message: string) => void;
  error: (message: string) => void;
  clear: () => void;
};

// type LogBuffer = {
//   entries: LogEntry[];
// }

type Actions =
  | {
      type: 'logging';
      entry: LogEntry;
      entries: LogEntry[];
      setBuf: Dispatch<SetStateAction<LogEntry[]>>;
    }
  | {type: 'clear'; setBuf: Dispatch<SetStateAction<LogEntry[]>>};

const LogContext = createContext({} as Log);
const LogBufferContext = createContext([] as LogEntry[]);

/**
 * Logを追加,削除したいコンポーネントで呼び出すこと
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

type MessageType = 'info' | 'error' | 'success' | 'warning';

/**
 * LogContextProviderコンポーネント
 * @param param0
 * @returns
 */
export function LogContextProvider({children}: {children: JSX.Element}) {
  const [buf, setBuf] = useState<LogEntry[]>([]);
  console.log('relroad buf', buf);

  const createEntry = useCallback(
    (type: MessageType, message: string): LogEntry => {
      return {type, message, timestamp: Date.now()};
    },
    [],
  );

  const info = useCallback((message: string) => {
    const entry = createEntry('info', message);
    console.log('info buf', buf);
    dispatch({type: 'logging', entries: buf, entry, setBuf});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const error = useCallback(
    (message: string) => {
      const entry = createEntry('error', message);
      console.log('error buf', buf);
      dispatch({type: 'logging', entries: buf, entry, setBuf});
    },
    [buf, createEntry],
  );

  const clear = useCallback(() => {
    console.log('clear');
    dispatch({type: 'clear', setBuf});
  }, []);

  const reducer = useCallback((state: Log, action: Actions): Log => {
    switch (action.type) {
      case 'logging':
        buf.unshift(action.entry);
        return {...state};
      case 'clear':
        buf.splice(0);
        return {...state};
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = {
    info,
    error,
    clear,
  };
  const [log, dispatch] = useReducer(reducer!, state);

  return (
    <LogContext.Provider value={log}>
      <LogBufferContext.Provider value={buf}>
        {children}
      </LogBufferContext.Provider>
    </LogContext.Provider>
  );
}
