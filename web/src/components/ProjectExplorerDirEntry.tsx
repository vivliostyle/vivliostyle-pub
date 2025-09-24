import {FC} from 'react';
import {
  Container,
  Icon,
  Input,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react';
import {ContextMenu} from 'chakra-ui-contextmenu';
import {VscFolder} from 'react-icons/vsc';
import {t} from 'i18next';
import {VFile} from 'theme-manager';
import {useProjectExplorerDirEntry} from './hooks';

/**
 * ProjectExplorer用ディレクトリ名表示コンポーネント
 */
export const ProjectExplorerDirEntry: FC<{
  file: VFile;
  currentDir: string;
  onClick: (file: VFile) => void;
  onReload: () => void;
}> = ({file, currentDir, onClick, onReload}) => {
  const {
    isRenaming,
    setRenaming,
    onRenameDirectory,
    isDuplicating,
    setDuplicating,
    onDuplicateDirectory,
    onDeleteDirectory,
  } = useProjectExplorerDirEntry(file, currentDir, onReload);

  return (
    <Container
      paddingInlineStart={1}
      onClick={() => {
        onClick(file);
      }}
      cursor="pointer"
    >
      <ContextMenu<HTMLDivElement>
        renderMenu={() => (
          <MenuList zIndex="999">
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenaming(true);
              }}
            >
              {t('フォルダ名を変更')}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDuplicating(true);
              }}
            >
              {t('フォルダを複製')}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteDirectory(file.name, file.hash);
              }}
            >
              {t('フォルダを削除')}
            </MenuItem>
          </MenuList>
        )}
      >
        {(ref: React.LegacyRef<HTMLParagraphElement> | undefined) => (
          <Text
            ref={ref}
            mt={1}
            fontSize="sm"
            fontWeight={'normal'}
            display="inline-block"
            width="100%"
            _hover={{textDecoration: 'underline'}}
          >
            {isRenaming ? (
              <Input
                autoFocus={true}
                defaultValue={file.name}
                onBlur={(e: any) => {
                  setRenaming(false);
                  onRenameDirectory(e);
                }}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  if (event.key == 'Enter') {
                    event.preventDefault();
                    onRenameDirectory(event);
                    setRenaming(false);
                  } else if (event.key === 'Esc' || event.key === 'Escape') {
                    event.preventDefault();
                    setRenaming(false);
                  }
                }}
                onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
            ) : (
              <>
                <Icon as={VscFolder} /> {file.name}/
                {isDuplicating ? (
                  <Input
                    autoFocus={true}
                    defaultValue={file.name}
                    onBlur={(e: any) => {
                      setDuplicating(false);
                      onDuplicateDirectory(e);
                    }}
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>,
                    ) => {
                      console.log(event.key);
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onDuplicateDirectory(event);
                        setDuplicating(false);
                      } else if (
                        event.key === 'Esc' ||
                        event.key === 'Escape'
                      ) {
                        event.preventDefault();
                        setDuplicating(false);
                      }
                    }}
                    onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
                ) : null}
              </>
            )}
          </Text>
        )}
      </ContextMenu>
    </Container>
  );
};
