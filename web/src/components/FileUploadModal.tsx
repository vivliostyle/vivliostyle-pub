import {FC} from 'react';
import {
  Button,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';
import {User} from 'firebase/auth';
import {useFileUploadModal} from './hooks';

export const FileUploadModal: FC<{
  user: User | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  accept: string;
}> = ({user, isOpen, onOpen, onClose, title, accept}) => {
  const {fileName, inputRef, isBusy, onFileInputChange, onUploadButtonClick} =
    useFileUploadModal(user, onOpen, onClose);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InputGroup>
            <Button onClick={() => inputRef.current?.click()}>
              Select File
            </Button>
            <Input
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
          </InputGroup>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={onUploadButtonClick}
            isLoading={isBusy}
          >
            Upload
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
