import React, {useCallback, useState, useRef, useMemo} from 'react';
import * as UI from './ui';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {User} from 'firebase/auth';
import {createFile} from '@services/serverSideFunctions';
import {useLogContext} from '@middlewares/contexts/useLogContext';

export const FileUploadModal = ({
  user,
  isOpen,
  onOpen,
  onClose,
}: {
  user: User | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
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
        log.warning('file not selected', 3000);
        return;
      }
      if (user === null) {
        log.warning('user not found', 3000);
        return;
      }
      setBusy(true);
      try {
        const response = await createFile(
          {
            user,
            owner: repository.owner!,
            repo: repository.repo!,
            branch: repository.branch!,
            path: fileName,
          },
          file,
        );
        if (!response) {
          return;
        }
        if (response.status === 201) {
          repository.selectBranch(repository.branch!); // ファイル一覧の更新
          log.success('image uploaded', 3000);
        } else if (response.status === 400 || response.status === 401) {
          log.error('authentication error', 3000);
        } else if (response.status === 413) {
          log.error('image size too large', 3000);
        } else {
          log.error('error : ' + response.status, 3000);
        }
        onClose();
      } catch (error) {
        console.error(error);
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
        <UI.ModalHeader>Upload Image</UI.ModalHeader>
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
              accept={'image/*'}
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
