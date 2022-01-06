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
import {VscFolder} from 'react-icons/vsc';

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

  /**
   * ファイル削除コンテクストメニュー
   * @param filename
   * @param hash
   */
   const onDeleteDirectory = (filename: string, hash: string | undefined) => {
    (async () => {
      const filePath = upath.join(currentDir, filename);
      if (!confirm(`ディレクトリ(${filePath})を削除しますか?`)) {
        return;
      }
      const result = (await app.gqlclient?.mutate({
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
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          path: filename,
          message: 'delete directory',
        },
      })) as any;
      console.log('delete result', result);
      if (result.data.commitDirectory.state) {
        log.success(`ディレクトリ(${filePath})を削除しました`, 3000);
        onReload();
      } else {
        log.error(`ディレクトリ(${filePath})の削除に失敗しました`, 3000);
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
              color={"gray"}
              disabled={true}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // setRenaming(true);
              }}
            >
              Rename Directory
            </UI.MenuItem>
            <UI.MenuItem
              color={"gray"}
              disabled={true}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // setDuplicating(true);
              }}
            >
              Duplicate Directory
            </UI.MenuItem>
            <UI.MenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteDirectory(file.name, file.hash);
              }}
            >
              Delete Directory
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
            <UI.Icon as={VscFolder} /> {file.name}/
          </UI.Text>
        )}
      </ContextMenu>
    </UI.Container>
  );
}
