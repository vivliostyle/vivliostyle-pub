/**
 * ProjectExplorer用ディレクトリ名表示コンポーネント
 */
import {gql, useMutation} from '@apollo/client';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {VFile} from 'theme-manager';
import * as UI from '@components/ui';
import {ContextMenu} from 'chakra-ui-contextmenu';
import upath from 'upath';
import { VscFolder } from 'react-icons/vsc';

export default function DirEntry({
  file,
  onClick,
  onReload,
}: {
  file: VFile;
  onClick: (file: VFile) => void;
  onReload: () => void;
}) {
  return (
    <UI.Container
      paddingInlineStart={1}
      onClick={() => {
        onClick(file);
      }}
      cursor="pointer"
    >
      <UI.Text
        mt={1}
        fontSize="sm"
        fontWeight={'normal'}
        display="inline-block"
        width="100%"
        _hover={{textDecoration: 'underline'}}
      >
        <UI.Icon as={VscFolder}/> {file.name}/
      </UI.Text>
    </UI.Container>
  );
}
