import * as UI from '@components/ui';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';

export function Footer() {
  const currentFile = useCurrentFileContext();
  return (
    <UI.Box
      color={'white'}
      width={'100vw'}
      height={'1rem'}
      backgroundColor={'gray'}
      paddingLeft={10}
      fontSize={'0.5rem'}
    >
      Vivliostyle Pub α ver.0.1.0 [{currentFile.state.state ?? ''}]
    </UI.Box>
  );
}
