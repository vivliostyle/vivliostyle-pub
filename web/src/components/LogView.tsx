import * as UI from '@components/ui';
import {useLogBufferContext} from '@middlewares/useLogContext';
import { useEffect } from 'react';

export function LogView({onError}:{onError:(num:number)=>void}) {
  const log = useLogBufferContext();
  useEffect(()=>{
    onError(log.length);    
  },[log.length]);
  return (
    <UI.Box w="100%" h="100%" overflow="scroll" p={5} backgroundColor="lightgray">
      <UI.Stack spacing={3}>
        {log.map((entry) => (
          <UI.Alert status={entry.type} key={entry.key}>
            <UI.AlertIcon />
            [{new Date(entry.timestamp).toISOString()}]:{entry.message}
          </UI.Alert>
        ))}
      </UI.Stack>
    </UI.Box>
  );
}
