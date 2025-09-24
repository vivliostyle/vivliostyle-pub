import {FC} from 'react';
import {Box} from '@chakra-ui/react';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';

export const Footer: FC = () => {
  const currentFile = useCurrentFileContext();
  return (
    <Box
      color={'white'}
      width={'100vw'}
      height={'1rem'}
      backgroundColor={'gray'}
      paddingLeft={10}
      fontSize={'0.5rem'}
    >
      Vivliostyle Pub α ver.0.1.0 [{currentFile.state.state ?? ''}]
    </Box>
  );
};
