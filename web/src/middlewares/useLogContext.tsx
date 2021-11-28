import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useReducer,
  useState,
} from 'react';
import { useToast } from "@chakra-ui/react"

type LogEntry = {
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
};

type Log = {
  info: (message: string, toastDuration?: number) => void;
  error: (message: string, toastDuration?: number) => void;
  success: (message: string, toastDuration?: number) => void;
  warning: (message: string, toastDuration?: number) => void;
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

type MessageType ="info" | "warning" | "success" | "error" | undefined;

/**
 * LogContextProviderコンポーネント
 * @param param0
 * @returns
 */
export function LogContextProvider({children}: {children: JSX.Element}) {
  const toast = useToast();

  const [buf, setBuf] = useState<LogEntry[]>([]);
  console.log('relroad buf', buf);

  const createEntry = useCallback(
    (type: MessageType, message: string): LogEntry => {
      // type指定がundefinedならとりあえず'info'にする
      return {type:type??'info', message, timestamp: Date.now()};
    },
    [],
  );

  const logging = useCallback((status:MessageType, message:string, toastDuration: number | null = 0) => { 
    if(toastDuration && toastDuration > 0) {
      toast({
        title: message,
        status: status,
        duration: toastDuration
      })  
    }
    const entry = createEntry(status, message);
    dispatch({type: 'logging', entries: buf, entry, setBuf});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const info = useCallback((message: string, toastDuration: number | null = 0) => {
    logging('info', message, toastDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const warning = useCallback((message: string, toastDuration: number | null = 0) => {
    logging('warning', message, toastDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const success = useCallback((message: string, toastDuration: number | null = 0) => {
    logging('success', message, toastDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const error = useCallback((message: string, toastDuration: number | null = 0) => {
      logging('error', message, toastDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

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
    success,
    warning,
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
