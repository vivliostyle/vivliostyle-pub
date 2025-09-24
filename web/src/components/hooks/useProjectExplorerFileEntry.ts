import {useMemo, useState} from 'react';
import {gql} from '@apollo/client';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import upath from 'upath';
import {
  VscCode,
  VscFile,
  VscFileMedia,
  VscMarkdown,
  VscSettingsGear,
  VscSymbolNamespace,
} from 'react-icons/vsc';
import {WebApiFs} from '@middlewares/fs/WebApiFS';
import mime from 'mime-types';
import {t} from 'i18next';
import {VFile} from 'theme-manager';

export const useProjectExplorerFileEntry = (
  file: VFile,
  currentDir: string,
  onReload: () => void,
) => {
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
   * ファイル 複製/リネーム
   * @param oldFilename
   * @param newFilename
   * @param removeOldPath
   * @param message
   */
  const copyFile = async (
    oldFilename: string,
    newFilename: string,
    removeOldPath: boolean,
    message: string,
  ) => {
    const oldFilePath = upath.join(currentDir, oldFilename);
    const newFilePath = upath.join(currentDir, newFilename);

    console.log('[FileEntry] copy', oldFilePath, newFilePath);

    const result = (await app.state.gqlclient?.mutate({
      mutation: gql`
        mutation renameFile(
          $owner: String!
          $repo: String!
          $branch: String!
          $oldPath: String!
          $newPath: String!
          $removeOldPath: Boolean!
          $message: String!
        ) {
          commitContent(
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
        oldPath: oldFilePath,
        newPath: newFilePath,
        removeOldPath,
        message,
      },
    })) as any;

    console.log('[FileEntry] copy result', result);
    return result;
  };

  const renameFile = async (e: any) => {
    setRenaming(false);
    // console.log('renameFile', e);
    const oldFilename = file.name;
    const newFilename = e.target!.value;
    if (oldFilename === newFilename) {
      return;
    }
    const result = await copyFile(
      oldFilename,
      newFilename,
      true,
      'rename file',
    );
    if (result.data.commitContent.state) {
      log.success(
        t('ファイルをリネームしました', {
          oldfilepath: oldFilename,
          newfilepath: newFilename,
        }),
        3000,
      );
      onReload();
    } else {
      log.error(
        t('ファイルのリネームに失敗しました', {
          oldfilepath: oldFilename,
          error: result.data.commitContent.message,
        }),
        3000,
      );
    }
  };

  const duplicateFile = async (e: any) => {
    setDuplicating(false);
    const oldFilename = file.name;
    const newFilename = e.target!.value;
    if (oldFilename === newFilename) {
      return;
    }
    const result = await copyFile(
      oldFilename,
      newFilename,
      false,
      'duplicate a file',
    );
    if (result.data.commitContent.state) {
      log.success(
        t(`ファイルを複製しました`, {
          oldfilepath: oldFilename,
          newfilepath: newFilename,
        }),
        3000,
      );
      onReload();
    } else {
      log.error(
        t('ファイルの複製に失敗しました', {
          oldfilepath: oldFilename,
          error: result.data.commitContent.message,
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
  const onDeleteFile = (filename: string, hash: string | undefined) => {
    (async () => {
      const filePath = upath.join(currentDir, filename);
      if (!confirm(t('ファイルを削除しますか?', {filepath: filePath}))) {
        return;
      }
      const result = (await app.state.gqlclient?.mutate({
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
          owner: repository.state.owner,
          repo: repository.state.repo,
          branch: repository.state.branch,
          path: filePath,
          message: 'delete file',
        },
      })) as any;
      console.log('delete result', result);
      if (result.data.commitContent.state) {
        log.success(t('ファイルを削除しました', {filepath: filePath}), 3000);
        onReload();
      } else {
        log.error(
          t('ファイルの削除に失敗しました', {
            filepath: filePath,
            error: 'API error',
          }),
          3000,
        );
      }
    })();
  };

  /**
   * ファイルダウンロード コンテクストメニュー
   * @param e
   */
  const onDownloadFile = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    const path = upath.join(currentDir, file.name);

    const props = {
      user: app.state.user!,
      owner: repository.state.owner!,
      repo: repository.state.repo!,
      branch: repository.state.branch!,
    };
    WebApiFs.open(props)
      .then((fs) => {
        fs.readFile(path).then((content) => {
          // console.log('dispatch setFileCallback', seq,action.file,content);
          if (content == undefined || content == null) {
            // 0バイトのファイルがあるため、!contentでは駄目
            log.error(
              t('ファイルを取得できませんでした', {
                filepath: path,
                error: 'content error',
              }),
              3000,
            );
            return false;
          }
          const type = mime.lookup(file.name) || 'application/octet-stream';
          const decodedData: string | Buffer = isBase64(content as string);
          const blob = new Blob([decodedData], {type});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.download = file.name;
          a.href = url;
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      })
      .catch((err) => {
        log.error(
          t('ファイルを取得できませんでした', {
            filepath: path,
            error: err.messsage,
          }),
          3000,
        );
      });
  };

  return {
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
  };
};

/**
 * 与えられた文字列がBase64ならBufferを、そうでなければ文字列を返す
 * TODO: メソッド名を替える
 * @param str ファイルコンテンツの文字列
 * @returns
 */
function isBase64(str: string): Buffer | string {
  if (str === '' || str.trim() === '') {
    return str;
  }
  try {
    const buffer = Buffer.from(str, 'base64');
    const str2 = Buffer.from(buffer).toString('base64');
    return str2 == str.trim().replaceAll('\n', '') ? buffer : str;
  } catch (err) {
    return str;
  }
}
