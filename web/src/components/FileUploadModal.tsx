import React, { useCallback, useState, useRef, useMemo } from 'react';
import * as UI from './ui';
import firebase from '@services/firebase';
import { useToast } from "@chakra-ui/react"


const getBase64 = (file: File):Promise<string | ArrayBuffer | null> => {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file)
  })
}

export const FileUploadModal = ({
  user,
  owner,
  repo,
  isOpen,
  onOpen,
  onClose,
}: {
  user: firebase.User | null;
  owner: string;
  repo: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
  const [file, setFile] = useState<File|null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null)

  const fileName = useMemo(() => {
    if(!file) return ""
    return file.name
  }, [file])

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files) setFile(e.target.files?.item(0))
  };

  const toast = useToast()
  const onUploadButtonClick = useCallback(() => {
    (async () => {
      if(file===null) {
        toast({
          title: "file not selected",
          status: "warning",
        })
        return
      }
      if(user===null) {
        toast({
          title: "user not found",
          status: "warning",
        })
        return
      }
      setBusy(true)
      const base64image = await getBase64(file)
      const idToken = await user.getIdToken();
      try {
        await fetch('/api/github/createFileContents', {
          method: 'POST',
          body: JSON.stringify({
            owner,
            repo,
            path: fileName,
            content: base64image?.toString().replace("data:image/jpeg;base64,", "")
          }),
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        });
        toast({
          title: "image uploaded",
          status: "success",
        })
        onClose()
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })()
  }, [user, file, fileName])

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
