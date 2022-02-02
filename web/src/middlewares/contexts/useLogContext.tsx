import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {useToast} from '@chakra-ui/react';

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

/**
 * LogContextBufferProviderコンポーネント
 * ログ保存コンテクスト
 * @param param0
 * @returns
 */
export function LogBufferContextProvider({children}: {children: JSX.Element}) {
  const [buf, setBuf] = useState<LogEntry[]>([]);

  /**
   * ログ項目を追加
   * @param entry 記録内容
   */
  const handleLogging = (entry: LogEntry) => {
    setBuf((pre)=>{ // preにはレンダリング前でも最新の値が入っている
      const newBuf = [entry, ...pre];
      return newBuf
    });
  };

  /**
   * ログ項目を全て削除
   */
  const handleClear = () => {
    setBuf([]);
  };

  // console.log('[LogBufferContext] render');
  return (
    <React.StrictMode>
      <LogBufferContext.Provider value={buf}>
        <LogContextProvider onLogging={handleLogging} onClear={handleClear}>
          {children}
        </LogContextProvider>
      </LogBufferContext.Provider>
    </React.StrictMode>
  );
}

/**
 * LogContextProviderコンポーネント
 * このコンポーネントの状態は変化しない
 * @param param0
 * @returns
 */
function LogContextProvider({
  children,
  onLogging,
  onClear,
}: {
  children: JSX.Element;
  onLogging: (entry: LogEntry) => void;
  onClear: () => void;
}) {
  // console.log('[LogContext]',onLogging,onClear);

  const toast = useToast();

  const logging = useCallback(
    (
      status: MessageType | undefined,
      message: ReactNode,
      toastDuration: number | null = 0,
    ) => {
      const entry = {type: status ?? 'info', message, timestamp: Date.now()};
      onLogging(entry);
      if (toastDuration && toastDuration > 0) {
        toast({
          title: message,
          status: status,
          duration: toastDuration,
        });
      }
    },
    [onLogging, toast],
  );

  const log = useMemo(() => {
    return {
      info: (message: ReactNode, toastDuration: number | null = 0) => {
        logging('info', message, toastDuration);
      },
      error: (message: ReactNode, toastDuration: number | null = 0) => {
        logging('error', message, toastDuration);
      },
      success: (message: ReactNode, toastDuration: number | null = 0) => {
        logging('success', message, toastDuration);
      },
      warning: (message: ReactNode, toastDuration: number | null = 0) => {
        logging('warning', message, toastDuration);
      },
      clear: () => {
        console.log('clear');
        onClear();
      },
    };
  }, []);
  return <LogContext.Provider value={log}>{children}</LogContext.Provider>;
}
