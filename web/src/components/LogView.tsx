import * as UI from '@components/ui';
import {useLogContext} from '@middlewares/useLogContext';
import { useEffect, useRef } from 'react';

export function LogView() {
  const log = useLogContext();

  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <UI.Box w="100%" h="100%" overflow="scroll" p={5} backgroundColor="lightgray">
      <UI.Stack spacing={3}>
        {log.entries.map((entry) => (
          <UI.Alert status={entry.type} key={entry.timestamp}>
            <UI.AlertIcon />
            [{new Date(entry.timestamp).toISOString()}]:{entry.message}
          </UI.Alert>
        ))}
      </UI.Stack>
    </UI.Box>
  );
}
