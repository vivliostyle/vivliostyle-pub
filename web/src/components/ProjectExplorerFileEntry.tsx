/**
 * ProjectExplorer用ファイル名表示コンポーネント
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
import { useState } from 'react';

// ファイルのリネーム
const RENAME = gql`
  mutation renameContent(
    $owner: String!
    $repo: String!
    $branch: String!
    $oldPath: String!
    $newPath: String!
    $sha: String!
  ) {
    renameContent(
      owner: $owner
      repo: $repo
      branch: $branch
      oldPath: $oldPath
      newPath: $newPath
      sha: $sha
    ) {
      state
    }
  }
`;
// ファイルの削除
const DELETE = gql`
  mutation deleteContent(
    $owner: String!
    $repo: String!
    $branch: String!
    $name: String!
    $sha: String!
  ) {
    deleteContent(owner: $owner, repo: $repo,branch: $branch, name: $name, sha: $sha) {
      state
    }
  }
`;

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

  const [isRenaming,setRenaming] = useState<boolean>(false);

  // GraphQLのクエリメソッド
  const [renameContent, {loading: renameLoading, error: renameError}] =
    useMutation(RENAME, {
      client: app.gqlclient,
    });
  const [deleteContent, {loading: deleteLoading, error: deleteError}] =
    useMutation(DELETE, {
      client: app.gqlclient,
    });
  /**
   * ファイル名変更コンテクストメニュー
   * @param filename 
   * @param hash 
   */
  const onRenameFile = (oldFilename: string, newFilename:string , hash: string | undefined) => {
    (async () => {
      const oldFilePath = upath.join(currentDir, oldFilename);
      const newFilePath = upath.join(currentDir, newFilename);
      const result = await renameContent({
        variables: {
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          oldPath: oldFilePath,
          newPath: newFilePath,
          sha: hash,
        },
      });
      console.log('rename result', result);
      if (result.data.renameContent.state) {
        log.success(
          `ファイル(${oldFilePath})を(${newFilePath})にリネームしました`,
          3000,
        );
        onReload();
      } else {
        log.error(`ファイル(${oldFilePath})のリネームに失敗しました`, 3000);
      }
    })();
  };

  const renameFile = (e:any) => {
    setRenaming(false);
    console.log("renameFile", e);
    const oldFilename = file.name;
    const newFilename = e.target!.value;
    if(oldFilename === newFilename) {
        return;
    }
    onRenameFile(oldFilename,newFilename,file.hash);
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
      const result = await deleteContent({
        variables: {
          owner: repository.owner,
          repo: repository.repo,
          branch: repository.branch,
          name: filePath,
          sha: hash,
        },
      });
      console.log('delete result', result);
      if (result.data.deleteContent.state) {
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
          if( ! isRenaming) {
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
                  onDeleteFile(file.name, file.hash);
                }}
              >
                Delete File
              </UI.MenuItem>
            </UI.MenuList>
          )
        }
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
            {isRenaming ? (<UI.Input
            defaultValue={file.name}
            onBlur={(e:any)=>{
                setRenaming(false);
                renameFile(e);
            }}
            onKeyPress={(e:any) => {
                if (e.key == 'Enter') {
                  e.preventDefault();
                  renameFile(e);
                }
            }}
             />) : file.name}
          </UI.Text>
        )}
      </ContextMenu>
    </UI.Container>
  );
}
