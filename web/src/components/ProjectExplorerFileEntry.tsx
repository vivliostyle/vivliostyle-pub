/**
 * ProjectExplorer用ファイル名表示コンポーネント
 */
import {gql} from '@apollo/client';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {VFile} from 'theme-manager';
import * as UI from '@components/ui';
import {ContextMenu} from 'chakra-ui-contextmenu';
import upath from 'upath';
import {useMemo, useState} from 'react';
import {
  VscCode,
  VscFile,
  VscFileMedia,
  VscMarkdown,
  VscSettingsGear,
  VscSymbolNamespace,
} from 'react-icons/vsc';

export default function FileEntry({
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
  const currentFile = useCurrentFileContext();

  const [isRenaming, setRenaming] = useState<boolean>(false);
  const [isDuplicating, setDuplicating] = useState<boolean>(false);

  const icon = useMemo(() => {
    const ext = upath.extname(file.name).toLowerCase();
    if (file.name == 'vivliostyle.config.js') {
      return VscSettingsGear;
    } else if (ext == '.md') {
      return VscMarkdown;
    } else if (
      ext == '.html' ||
      ext == '.htm' ||
      ext == '.xhtml' ||
      ext == '.xhtm'
    ) {
      return VscCode;
    } else if (ext == '.css') {
      return VscSymbolNamespace;
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) {
      return VscFileMedia;
    } else {
      return VscFile;
    }
  }, [file]);

  /**
   * ファイル名変更コンテクストメニュー
   * @param oldFilename
   * @param newFilename
   * @param hash
   */
  const onRenameFile = (
    oldFilename: string,
    newFilename: string,
    hash: string | undefined,
  ) => {
    (async () => {
      const oldFilePath = upath.join(currentDir, oldFilename);
      const newFilePath = upath.join(currentDir, newFilename);

      const result = (await app.gqlclient?.mutate({
        mutation: gql`
          mutation renameFile(
            $owner: String!
            $repo: String!
            $branch: String!
            $oldPath: String!
            $newPath: String!
            $message: String!
          ) {
            commitContent(
              params: {
                owner: $owner,
                repo: $repo,
                branch: $branch,
                oldPath: $oldPath,
                newPath: $newPath,
                removeOldPath: true,
                message: $message,
              }
            ) {
              state
              message
            }
          }
        `,
        variables: {
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          oldPath: oldFilePath,
          newPath: newFilePath,
          message: 'rename file',
        },
      })) as any;

      console.log('rename result', result);

      if (result.data.commitContent.state) {
        log.success(
          `ファイル(${oldFilePath})を(${newFilePath})にリネームしました`,
          3000,
        );
        onReload();
      } else {
        log.error(`ファイル(${oldFilePath})のリネームに失敗しました: ${result.data.commitContent.message}`, 3000);
      }
    })();
  };

  const renameFile = (e: any) => {
    setRenaming(false);
    // console.log('renameFile', e);
    const oldFilename = file.name;
    const newFilename = e.target!.value;
    if (oldFilename === newFilename) {
      return;
    }
    onRenameFile(oldFilename, newFilename, file.hash);
  };

  /**
   * ファイル複製コンテクストメニュー
   * TODO: renameと共通化する
   * @param e 
   */
   const onDuplicateFile = (
    oldFilename: string,
    newFilename: string,
    hash: string | undefined,
  ) => {
    (async () => {
      const oldFilePath = upath.join(currentDir, oldFilename);
      const newFilePath = upath.join(currentDir, newFilename);

      const result = (await app.gqlclient?.mutate({
        mutation: gql`
          mutation duplicateFile(
            $owner: String!
            $repo: String!
            $branch: String!
            $oldPath: String!
            $newPath: String!
            $message: String!
          ) {
            commitContent(
              params: {
                owner: $owner,
                repo: $repo,
                branch: $branch,
                oldPath: $oldPath,
                newPath: $newPath,
                removeOldPath: false,
                message: $message,
              }
            ) {
              state
              message
            }
          }
        `,
        variables: {
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          oldPath: oldFilePath,
          newPath: newFilePath,
          message: 'duplicate file',
        },
      })) as any;

      console.log('duplicate result', result);

      if (result.data.commitContent.state) {
        log.success(
          `ファイル(${oldFilePath})を(${newFilePath})に複製しました`,
          3000,
        );
        onReload();
      } else {
        log.error(`ファイル(${oldFilePath})の複製に失敗しました: ${result.data.commitContent.message}`, 3000);
      }
    })();
  };

  const duplicateFile = (e: any) => {
    setDuplicating(false);
    const oldFilename = file.name;
    const newFilename = e.target!.value;
    if (oldFilename === newFilename) {
      return;
    }
    onDuplicateFile(oldFilename, newFilename, file.hash);
  }


  /**
   * ファイル削除コンテクストメニュー
   * @param filename
   * @param hash
   */
  const onDeleteFile = (filename: string, hash: string | undefined) => {
    (async () => {
      const filePath = upath.join(currentDir, filename);
      if (!confirm(`ファイル(${filePath})を削除しますか?`)) {
        return;
      }
      const result = (await app.gqlclient?.mutate({
        mutation: gql`
          mutation deleteFile(
            $owner: String!
            $repo: String!
            $branch: String!
            $path: String!
            $message: String!
          ) {
            commitContent(
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
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          path: filename,
          message: 'delete file',
        },
      })) as any;
      console.log('delete result', result);
      if (result.data.commitContent.state) {
        log.success(`ファイル(${filePath})を削除しました`, 3000);
        onReload();
      } else {
        log.error(`ファイル(${filePath})の削除に失敗しました`, 3000);
      }
    })();
  };

  return (
    <UI.Container
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
          <UI.MenuList zIndex="999">
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenaming(true);
              }}
            >
              Rename File
            </UI.MenuItem>
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDuplicating(true);
              }}
            >
              Duplicate File
            </UI.MenuItem>
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteFile(file.name, file.hash);
              }}
            >
              Delete File
            </UI.MenuItem>
          </UI.MenuList>
        )}
      >
        {(ref: React.LegacyRef<HTMLParagraphElement> | undefined) => (
          <UI.Text
            ref={ref}
            mt={1}
            fontSize="sm"
            fontWeight={
              file.name == currentFile?.file?.name ? 'bold' : 'normal'
            }
            display="inline-block"
            width="100%"
            _hover={{textDecoration: 'underline'}}
          >
            {isRenaming ? (
              <UI.Input
                defaultValue={file.name}
                onBlur={(e: any) => {
                  setRenaming(false);
                  renameFile(e);
                }}
                onKeyPress={(e: any) => {
                  if (e.key == 'Enter') {
                    e.preventDefault();
                    renameFile(e);
                  }
                }}
              />
            ) : (
              <>
              <UI.Text>
                <UI.Icon as={icon} /> {file.name}
              </UI.Text>
              { isDuplicating ? (
                <UI.Input
                defaultValue={file.name}
                onBlur={(e: any) => {
                  setDuplicating(false);
                  duplicateFile(e);
                }}
                onKeyPress={(e: any) => {
                  if (e.key == 'Enter') {
                    e.preventDefault();
                    duplicateFile(e);
                  }
                }}
              />
              ):null}
              </>
            ) }
          </UI.Text>
        )}
      </ContextMenu>
    </UI.Container>
  );
}