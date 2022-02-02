import React, {useCallback, useState, useRef, useMemo} from 'react';
import * as UI from './ui';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {User} from 'firebase/auth';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {gql} from '@apollo/client';
import upath from 'upath';
import {useTranslation} from 'react-i18next';

/**
 *
 * @param file
 * @returns
 */
export const getBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const FileUploadModal = ({
  user,
  isOpen,
  onOpen,
  onClose,
  title,
  accept,
}: {
  user: User | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  accept: string;
}) => {
  const {t, i18n} = useTranslation();

  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
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
      setBusy(true);
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
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, repository, file, fileName, onClose]);

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <UI.ModalOverlay />
      <UI.ModalContent>
        <UI.ModalHeader>{title}</UI.ModalHeader>
        <UI.ModalCloseButton />
        <UI.ModalBody>
          <UI.InputGroup>
            <UI.Button onClick={() => inputRef.current?.click()}>
              Select File
            </UI.Button>
            <UI.Input
              placeholder="Your file ..."
              value={fileName}
              isDisabled={true}
            />
            <input
              type="file"
              accept={accept}
              ref={inputRef}
              style={{display: 'none'}}
              onChange={onFileInputChange}
            ></input>
          </UI.InputGroup>
        </UI.ModalBody>

        <UI.ModalFooter>
          <UI.Button
            colorScheme="blue"
            mr={3}
            onClick={onUploadButtonClick}
            isLoading={busy}
          >
            Upload
          </UI.Button>
        </UI.ModalFooter>
      </UI.ModalContent>
    </UI.Modal>
  );
};
