/**
 * ログ管理コンテクスト
 */
import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {useToast} from '@chakra-ui/react';
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[useLogContext]');

type MessageType = 'info' | 'success' | 'warning' | 'error';

type LogEntry = {
  timestamp: number;
  type: MessageType;
  message: ReactNode;
};

export type Log = {
  info: (message: ReactNode, toastDuration?: number) => void;
  error: (message: ReactNode, toastDuration?: number) => void;
  success: (message: ReactNode, toastDuration?: number) => void;
  warning: (message: ReactNode, toastDuration?: number) => void;
  clear: () => void;
};

/**
 * ログバッファコンテクストオブジェクトの作成
 */
const LogBufferContext = createContext<LogEntry[]>([]);
/**
 * ログ操作コンテクストオブジェクトの作成
 */
const LogContext = createContext<Log>({
  info: (message: ReactNode, toastDuration?: number) => {},
  error: (message: ReactNode, toastDuration?: number) => {},
  success: (message: ReactNode, toastDuration?: number) => {},
  warning: (message: ReactNode, toastDuration?: number) => {},
  clear: () => {},
});

/**
 * Logを追加,削除したいコンポーネントで呼び出すこと
 * @returns LogContextオブジェクト
 */
export const useLogContext = () => useContext(LogContext);

/**
 * Logを読み込みたいコンポーネントで呼び出すこと
 * @returns
 */
export const useLogBufferContext = () => useContext(LogBufferContext);

/**
 * LogContextProviderコンポーネント
 * このコンポーネントの状態は変化しない
 * @param param0
 * @returns
 */
export const LogContextProvider: FC = ({children}) => {
  const [buf, setBuf] = useState<LogEntry[]>([]);

  const toast = useToast();

  const logging = useCallback(
    ({
      status,
      message,
      toastDuration,
    }: {
      status: MessageType | undefined;
      message: ReactNode;
      toastDuration: number | null;
    }) => {
      setBuf((buf) => {
        const entry = {type: status ?? 'info', message, timestamp: Date.now()};
        return [entry, ...buf];
      });
      if (toastDuration && toastDuration > 0) {
        toast({
          title: message,
          status: status,
          duration: toastDuration,
        });
      }
    },
    [],
  );

  const log = useMemo(() => {
    return {
      info: (message: ReactNode, toastDuration: number | null = 0) => {
        logging({status: 'info', message, toastDuration});
      },
      error: (message: ReactNode, toastDuration: number | null = 0) => {
        logging({status: 'error', message, toastDuration});
      },
      success: (message: ReactNode, toastDuration: number | null = 0) => {
        logging({status: 'success', message, toastDuration});
      },
      warning: (message: ReactNode, toastDuration: number | null = 0) => {
        logging({status: 'warning', message, toastDuration});
      },
      clear: () => {
        setBuf([]);
      },
    };
  }, [logging]);
  return (
    <LogBufferContext.Provider value={buf}>
      <LogContext.Provider value={log}>{children}</LogContext.Provider>
    </LogBufferContext.Provider>
  );
};
