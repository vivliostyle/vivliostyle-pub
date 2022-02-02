import {DeleteIcon} from '@chakra-ui/icons';
import * as UI from '@components/ui';
import {useLogBufferContext, useLogContext} from '@middlewares/contexts/useLogContext';
import {useCallback, useEffect} from 'react';

export function LogView({
  onLogging: onLogging,
}: {
  onLogging: (num: number) => void;
}) {
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

  return (
    <UI.Box
      w="100%"
      h="100%"
      p={0}
      backgroundColor="lightgray"
      overflowY="hidden"
    >
      <UI.Box
        height="100%"
        position="absolute"
        right="0"
        width="60px"
        backgroundColor="gray"
        p={1}
        pr={4}
      >
        <UI.Button>
          <DeleteIcon margin="0 auto" onClick={clearLog} />
        </UI.Button>
      </UI.Box>
      <UI.Box h="100%" overflow="scroll">
        <UI.Stack spacing={3} float="left" width="calc(100% - 64px)" p={2}>
          {logBuffer.map((entry) => (
            <UI.Alert status={entry.type} key={`${entry.timestamp}:${Math.random()}`}>
              <UI.AlertIcon />[{new Date(entry.timestamp).toISOString()}]:
              {entry.message}
            </UI.Alert>
          ))}
        </UI.Stack>
      </UI.Box>
    </UI.Box>
  );
}
