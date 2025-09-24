import {FC} from 'react';
import {
  Container,
  Icon,
  Input,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react';
import {ContextMenu} from 'chakra-ui-contextmenu';
import {VFile} from 'theme-manager';
import {t} from 'i18next';
import {isImageFile} from '@middlewares/frontendFunctions';
import {useProjectExplorerFileEntry} from './hooks';

/**
 * ProjectExplorer用ファイル名表示コンポーネント
 */
export const ProjectExplorerFileEntry: FC<{
  file: VFile;
  currentDir: string;
  onClick: (file: VFile) => void;
  onReload: () => void;
  onEmbedImage: (file: VFile) => void;
  onEmbedLink: (file: VFile) => void;
}> = ({file, currentDir, onClick, onReload, onEmbedImage, onEmbedLink}) => {
  const {
    currentFile,
    icon,
    renameFile,
    isRenaming,
    setRenaming,
    duplicateFile,
    isDuplicating,
    setDuplicating,
    onDeleteFile,
    onDownloadFile,
  } = useProjectExplorerFileEntry(file, currentDir, onReload);

  return (
    <Container
      paddingInlineStart={1}
      onClick={() => {
        if (!isRenaming) {
          onClick(file);
        }
      }}
      cursor="pointer"
      key={file.name}
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
              {t('ファイル名を変更')}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDuplicating(true);
              }}
            >
              {t('ファイルを複製')}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteFile(file.name, file.hash);
              }}
            >
              {t('ファイルを削除')}
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                onDownloadFile(e);
              }}
            >
              {t('ファイルをダウンロード')}
            </MenuItem>
            <MenuDivider />
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentFile.state.file) {
                  onEmbedLink(file);
                }
              }}
              color={currentFile.state.file ? 'black' : 'gray'}
            >
              {t('編集中のファイルにリンクを挿入')}
            </MenuItem>

            {isImageFile(file.name) ? (
              <MenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentFile.state.file) {
                    onEmbedImage(file);
                  }
                }}
                color={currentFile.state.file ? 'black' : 'gray'}
              >
                {t('編集中のファイルに画像を挿入')}
              </MenuItem>
            ) : null}
          </MenuList>
        )}
      >
        {(ref: React.LegacyRef<HTMLParagraphElement> | undefined) => (
          <Text
            ref={ref}
            mt={1}
            fontSize="sm"
            fontWeight={
              file.name == currentFile?.state.file?.name ? 'bold' : 'normal'
            }
            display="inline-block"
            width="100%"
            _hover={{textDecoration: 'underline'}}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {isRenaming ? (
              <Input
                autoFocus={true}
                defaultValue={file.name}
                onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                  setRenaming(false);
                  renameFile(event);
                }}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  if (event.key == 'Enter') {
                    event.preventDefault();
                    renameFile(event);
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
                <Icon as={icon} /> {file.name}
                {isDuplicating ? (
                  <>
                    <br />

                    <Input
                      autoFocus={true}
                      defaultValue={file.name}
                      onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                        setDuplicating(false);
                        duplicateFile(event);
                      }}
                      onKeyDown={(
                        event: React.KeyboardEvent<HTMLInputElement>,
                      ) => {
                        console.log(event.key);
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          duplicateFile(event);
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
                  </>
                ) : null}
              </>
            )}
          </Text>
        )}
      </ContextMenu>
    </Container>
  );
};
