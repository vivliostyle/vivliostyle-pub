import React, {useCallback, useState, useRef, useMemo} from 'react';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {User} from 'firebase/auth';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {gql} from '@apollo/client';
import upath from 'upath';
import {useTranslation} from 'react-i18next';

export type OnOpen = () => void;
export type OnClose = () => void;

export const useFileUploadModal = (
  user: User | null,
  onOpen: OnOpen,
  onClose: OnClose,
) => {
  const {t, i18n} = useTranslation();

  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();

  const [file, setFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fileName = useMemo(() => {
    if (!file) return '';
    return file.name;
  }, [file]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files?.item(0));
  };

  const onUploadButtonClick = useCallback(() => {
    (async () => {
      if (file === null) {
        log.warning(t('ファイルが選択されていません'), 3000);
        return;
      }
      if (user === null) {
        log.warning(t('ユーザ情報が取得できません'), 3000);
        return;
      }
      setIsBusy(true);
      try {
        const MAX_SIZE = 700; // Vercelによるアップロードサイズ上限(おそらく750KBあたり)
        if (file.size > MAX_SIZE * 1024) {
          log.error(
            t('ファイルサイズが大きすぎます', {
              MAX: MAX_SIZE,
              filename: file.name,
            }),
            1000,
          );
          return;
        }
        const encodedData = (await getBase64(file))?.toString().split(',')[1];
        const currentDir = repository.state.currentTree
          .map((f) => f.name)
          .join('/');
        const filePath = upath.join(currentDir, fileName);
        // console.log('upload image encodedData', encodedData);
        if (!encodedData) {
          log.error(
            t('ファイルを取得できませんでした', {
              filepath: filePath,
              error: 'conent error',
            }),
            1000,
          );
          return;
        }

        // TODO: リポジトリコンテクストにメソッド化したほうがowner,repo,branchの指定が不要になるので良いか
        const result = (await app.state.gqlclient?.mutate({
          mutation: gql`
            mutation createFile(
              $owner: String!
              $repo: String!
              $branch: String!
              $path: String!
              $encodedData: String!
              $message: String!
            ) {
              commitContent(
                params: {
                  owner: $owner
                  repo: $repo
                  branch: $branch
                  newPath: $path
                  newContent: $encodedData
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
            encodedData,
            message: 'create file',
          },
        })) as any;
        // console.log('upload image result',result);
        if (result.data.commitContent.state) {
          log.success(t('ファイルを追加しました', {filename: file.name}), 1000);
          repository.selectTree('.'); // ファイル一覧の更新
        } else {
          log.error(
            t('ファイルを追加できませんでした', {filename: file.name}),
            1000,
          );
        }
        onClose();
      } catch (error) {
        console.error(error);
        log.error(
          t('ファイルを追加できませんでした', {filename: file.name}),
          1000,
        );
      } finally {
        setIsBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, repository, file, fileName, onClose]);

  return {
    fileName,
    inputRef,
    isBusy,
    onFileInputChange,
    onUploadButtonClick,
  };
};

export const getBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
