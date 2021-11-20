import React, { useCallback, useState, useRef, useMemo } from 'react';
import * as UI from './ui';
import { useToast } from "@chakra-ui/react"
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { User } from 'firebase/auth';
import { createFile } from '@services/serverSideFunctions';
import { useLogContext } from '@middlewares/useLogContext';

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
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fileName = useMemo(() => {
    if (!file) return ""
    return file.name
  }, [file])

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files?.item(0))
  };

  const toast = useToast()
  const onUploadButtonClick = useCallback(() => {
    (async () => {
      if (file === null) {
        toast({
          title: "file not selected",
          status: "warning",
        })
        log.error('file not selected');
        return
      }
      if (user === null) {
        toast({
          title: "user not found",
          status: "warning",
        })
        log.error('user not found');
        return
      }
      setBusy(true)
      try {
        const response = await createFile({user, owner:repository.owner!, repo:repository.repo!, branch:repository.currentBranch!, path:fileName}, file);
        if(!response) { return; }
        if (response.status === 201) {
          toast({
            title: "image uploaded",
            status: "success",
          })
          log.info('image uploaded');
        } else if (response.status === 400 || response.status === 401) {
          toast({
            title: "authentication error",
            status: "error"
          })
          log.error('authentication error');
        } else if (response.status === 413) {
          toast({
            title: "image size too large",
            status: "error"
          })
          log.error('image size too large');
        } else {
          toast({
            title: "error:" + response.status,
            status: "error"
          })
          log.error('error : ' + response.status);          
        }
        onClose()
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, repository, file, fileName, onClose, toast])

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <UI.ModalOverlay />
      <UI.ModalContent>
        <UI.ModalHeader>Upload Image</UI.ModalHeader>
        <UI.ModalCloseButton />
        <UI.ModalBody>

          <UI.InputGroup>
            <UI.Button onClick={() => inputRef.current?.click()}>Select File</UI.Button>
            <UI.Input placeholder="Your file ..." value={fileName} isDisabled={true} />
            <input type='file' accept={'image/*'} ref={inputRef} style={{ display: 'none' }} onChange={onFileInputChange}></input>
          </UI.InputGroup>

        </UI.ModalBody>

        <UI.ModalFooter>
          <UI.Button colorScheme="blue" mr={3} onClick={onUploadButtonClick} isLoading={busy}>
            Upload
          </UI.Button>
        </UI.ModalFooter>
      </UI.ModalContent>
    </UI.Modal>
  );
};
