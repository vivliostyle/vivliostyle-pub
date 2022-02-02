/**
 * ProjectExplorer用ディレクトリ名表示コンポーネント
 */
import {gql} from '@apollo/client';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {VFile} from 'theme-manager';
import * as UI from '@components/ui';
import {ContextMenu} from 'chakra-ui-contextmenu';
import upath from 'upath';
import {VscFolder} from 'react-icons/vsc';
import {useState} from 'react';
import {t} from 'i18next';

export default function DirEntry({
  file,
  currentDir,
  onClick,
  onReload,
}: {
  file: VFile;
  currentDir: string;
  onClick: (file: VFile) => void;
  onReload: () => void;
}) {
  const app = useAppContext();
  const log = useLogContext();
  const repository = useRepositoryContext();

  const [isRenaming, setRenaming] = useState<boolean>(false);
  const [isDuplicating, setDuplicating] = useState<boolean>(false);

  /**
   * ディレクトリ 複製/リネーム
   * @param newPath
   * @param removeOldPath
   * @param message
   */
  const copyDirectory = async (
    newPath: string,
    removeOldPath: boolean,
    message: string,
  ) => {
    const oldDirPath = upath.join(currentDir, file.name);
    const newDirPath = upath.join(currentDir, newPath);
    const result = (await app.state.gqlclient?.mutate({
      mutation: gql`
        mutation copyDirectory(
          $owner: String!
          $repo: String!
          $branch: String!
          $oldPath: String!
          $newPath: String!
          $message: String!
          $removeOldPath: Boolean!
        ) {
          commitDirectory(
            params: {
              owner: $owner
              repo: $repo
              branch: $branch
              oldPath: $oldPath
              newPath: $newPath
              removeOldPath: $removeOldPath
              message: $message
            }
          ) {
            state
            message
          }
        }
      `,
      variables: {
        owner: repository.state.owner,
        repo: repository.state.repo,
        branch: repository.state.branch,
        oldPath: oldDirPath,
        newPath: newDirPath,
        removeOldPath,
        message,
      },
    })) as any;
    console.log('delete result', result);
    return result;
  };

  const onRenameDirectory = async (e: any) => {
    const filePath = e.target.value;
    const result = await copyDirectory(filePath, true, 'rename directory');
    if (result.data.commitDirectory.state) {
      log.success(
        t('フォルダをリネームしました', {
          oldfilepath: file.path,
          newfilepath: filePath,
        }),
        3000,
      );
      onReload();
    } else {
      log.error(
        t('フォルダのリネームに失敗しました', {
          oldfilepath: filePath,
          error: result.data.commitDirectory.message,
        }),
        3000,
      );
    }
  };

  const onDuplicateDirectory = async (e: any) => {
    const filePath = e.target.value;
    const result = await copyDirectory(filePath, false, 'duplicate directory');
    if (result.data.commitDirectory.state) {
      log.success(
        t(`フォルダを複製しました`, {
          oldfilepath: file.path,
          newfilepath: filePath,
        }),
        3000,
      );
      onReload();
    } else {
      log.error(
        t('フォルダの複製に失敗しました', {
          oldfilepath: file.path,
          error: result.data.commitDirectory.message,
        }),
        3000,
      );
    }
  };

  /**
   * ファイル削除コンテクストメニュー
   * @param filename
   * @param hash
   */
  const onDeleteDirectory = (filename: string, hash: string | undefined) => {
    (async () => {
      const filePath = upath.join(currentDir, filename);
      if (!confirm(t('フォルダを削除しますか?', {filepath: filePath}))) {
        return;
      }
      const result = (await app.state.gqlclient?.mutate({
        mutation: gql`
          mutation deleteDirectory(
            $owner: String!
            $repo: String!
            $branch: String!
            $path: String!
            $message: String!
          ) {
            commitDirectory(
              params: {
                owner: $owner
                repo: $repo
                branch: $branch
                oldPath: $path
                removeOldPath: true
                message: $message
              }
            ) {
              state
              message
            }
          }
        `,
        variables: {
          owner: repository.state.owner,
          repo: repository.state.repo,
          branch: repository.state.branch,
          path: filePath,
          message: 'delete directory',
        },
      })) as any;
      console.log('delete result', result);
      if (result.data.commitDirectory.state) {
        log.success(t('フォルダを削除しました', {filepath: filePath}), 3000);
        onReload();
      } else {
        log.error(
          t('フォルダの削除に失敗しました', {
            filepath: filePath,
            error: 'API error',
          }),
          3000,
        );
      }
    })();
  };

  return (
    <UI.Container
      paddingInlineStart={1}
      onClick={() => {
        onClick(file);
      }}
      cursor="pointer"
    >
      <ContextMenu<HTMLDivElement>
        renderMenu={() => (
          <UI.MenuList zIndex="999">
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenaming(true);
              }}
            >
              {t('フォルダ名を変更')}
            </UI.MenuItem>
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDuplicating(true);
              }}
            >
              {t('フォルダを複製')}
            </UI.MenuItem>
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteDirectory(file.name, file.hash);
              }}
            >
              {t('フォルダを削除')}
            </UI.MenuItem>
          </UI.MenuList>
        )}
      >
        {(ref: React.LegacyRef<HTMLParagraphElement> | undefined) => (
          <UI.Text
            ref={ref}
            mt={1}
            fontSize="sm"
            fontWeight={'normal'}
            display="inline-block"
            width="100%"
            _hover={{textDecoration: 'underline'}}
          >
            {isRenaming ? (
              <UI.Input
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
                <UI.Icon as={VscFolder} /> {file.name}/
                {isDuplicating ? (
                  <UI.Input
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
          </UI.Text>
        )}
      </ContextMenu>
    </UI.Container>
  );
}
