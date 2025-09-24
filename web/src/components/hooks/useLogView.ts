import {useCallback, useEffect} from 'react';
import {
  useLogBufferContext,
  useLogContext,
} from '@middlewares/contexts/useLogContext';

export type OnLogging = (num: number) => void;

export const useLogView = (onLogging: OnLogging) => {
  const logBuffer = useLogBufferContext();
  const log = useLogContext();
  console.log('[LogView]' /*,logBuffer*/);

  useEffect(() => {
    onLogging(logBuffer.length);
  }, [logBuffer, onLogging]);

  const clearLog = useCallback(() => {
    console.log('[LogView] clear');
    log.clear();
  }, [log]);

  return {
    logBuffer,
    clearLog,
  };
};
