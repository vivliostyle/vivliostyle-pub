import {FC} from 'react';
import {DeleteIcon} from '@chakra-ui/icons';
import {Alert, AlertIcon, Box, Button, Stack} from '@chakra-ui/react';
import {OnLogging, useLogView} from './hooks';

export const LogView: FC<{onLogging: OnLogging}> = ({onLogging}) => {
  const {logBuffer, clearLog} = useLogView(onLogging);

  return (
    <Box w="100%" h="100%" p={0} backgroundColor="lightgray" overflowY="hidden">
      <Box
        height="100%"
        position="absolute"
        right="0"
        width="60px"
        backgroundColor="gray"
        p={1}
        pr={4}
      >
        <Button>
          <DeleteIcon margin="0 auto" onClick={clearLog} />
        </Button>
      </Box>
      <Box h="100%" overflow="scroll">
        <Stack spacing={3} float="left" width="calc(100% - 64px)" p={2}>
          {logBuffer.map((entry) => (
            <Alert
              status={entry.type}
              key={`${entry.timestamp}:${Math.random()}`}
            >
              <AlertIcon />[{new Date(entry.timestamp).toISOString()}]:
              {entry.message}
            </Alert>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};
