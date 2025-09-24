import {useState} from 'react';
import {gql} from '@apollo/client';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {VFile} from 'theme-manager';
import upath from 'upath';
import {t} from 'i18next';

export const useProjectExplorerDirEntry = (
  file: VFile,
  currentDir: string,
  onReload: () => void,
) => {
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

  return {
    isRenaming,
    setRenaming,
    onRenameDirectory,
    isDuplicating,
    setDuplicating,
    onDuplicateDirectory,
    onDeleteDirectory,
  };
};
