import {FC, memo} from 'react';
import {RepeatIcon} from '@chakra-ui/icons';
import {VFile} from 'theme-manager';
import FileEntry from './ProjectExplorerFileEntry';
import DirEntry from './ProjectExplorerDirEntry';
import {VscArrowUp, VscNewFile, VscNewFolder} from 'react-icons/vsc';
import {CgCornerLeftUp} from 'react-icons/cg';
import {
  Box,
  Button,
  Center,
  Container,
  Flex,
  Icon,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
} from '@chakra-ui/react';
import {FileUploadModal} from './FileUploadModal';
import {t} from 'i18next';
import {User} from 'firebase/auth';
import {useProjectExplorer} from './hooks';

/**
 * プロジェクトエクスプローラーコンポーネント
 * @returns
 */
export const ProjectExplorer: FC = () => {
  const {
    appState,
    repository,
    setCreateForm,
    isOpenFileUploadModal,
    onOpenFileUploadModal,
    onCloseFileUploadModal,
    reload,
    lightBoxContent,
    setLightBoxContent,
    handleEmbedImage,
    handleEmbedLink,
    filenamesFilterText,
    setFilenamesFilterText,
    currentDir,
    createForm,
    createFileOrDirectory,
    filteredFiles,
    onClickFileEntry,
  } = useProjectExplorer();

  /**
   * 親ディレクトリへ移動するボタン
   */
  const UpToParentDirectoryButton = memo(
    function upToParentDirectoryButton(props: {currentTree: VFile[]}) {
      if (props.currentTree.length > 0) {
        return (
          <Container
            p={0}
            onClick={() => {
              repository.selectTree('..');
              setCreateForm(null);
            }}
            cursor="pointer"
          >
            <Text mt={3} fontSize="sm">
              <Icon as={CgCornerLeftUp} /> ..
            </Text>
          </Container>
        );
      } else {
        return null;
      }
    },
  );

  /**
   * 新規ファイル作成ボタン
   */
  const NewFileButton = memo(function newFileButton() {
    return (
      <Button
        title="new File"
        p="0"
        h="0"
        minH="1em"
        minW="1em"
        backgroundColor={'transparent'}
        onClick={() => {
          setCreateForm('file');
        }}
      >
        <Icon as={VscNewFile} w="1em" h="1em" p="0" />
      </Button>
    );
  });

  /**
   * 新規フォルダ作成ボタン
   */
  const NewFolderButton = memo(function newFolderButton() {
    return (
      <Button
        title="new Folder"
        p="0"
        h="0"
        minH="1em"
        minW="1em"
        backgroundColor={'transparent'}
        onClick={() => {
          setCreateForm('dir');
        }}
      >
        <Icon as={VscNewFolder} w="1em" h="1em" p="0" />
      </Button>
    );
  });

  /**
   * ファイルアップロードボタン
   */
  const UploadButton = memo(function uploadButton(props: {user: User | null}) {
    return (
      <>
        <Button
          title="upload file"
          p="0"
          h="0"
          minH="1em"
          minW="1em"
          backgroundColor={'transparent'}
          onClick={onOpenFileUploadModal}
        >
          <Icon
            as={VscArrowUp}
            w="1em"
            h="1em"
            p="0"
            border="solid 1px black"
          />
        </Button>
        <FileUploadModal
          user={props.user}
          isOpen={isOpenFileUploadModal}
          onOpen={onOpenFileUploadModal}
          onClose={onCloseFileUploadModal}
          title="Upload File"
          accept="*"
        />
      </>
    );
  });

  /**
   * カレントディレクトリの内容のリロードボタン
   */
  const ReloadButton = memo(function reloadButton() {
    return (
      <Button textAlign="right" onClick={reload}>
        <RepeatIcon />
      </Button>
    );
  });

  /**
   * 画像表示用 ライトボックスコンポーネント
   * @param param0
   * @returns
   */
  const LightBox = memo(function lightBox(props: {
    lightBoxContent: {
      file: VFile;
      data: string;
    } | null;
  }) {
    return (
      <Modal
        isOpen={lightBoxContent != null}
        onClose={() => {
          setLightBoxContent(null);
        }}
        isCentered
        size={'xl'}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{lightBoxContent?.file.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody backgroundColor={'gray'}>
            <Center>
              <Image
                alt="image"
                src={lightBoxContent?.data}
                objectFit={'scale-down'}
              />
            </Center>
          </ModalBody>
          <ModalFooter backgroundColor={'gray'}>
            <Center>
              <Button
                onClick={() => {
                  setLightBoxContent(null);
                  console.log('embedImage lightbox', lightBoxContent?.file);
                  handleEmbedImage(lightBoxContent?.file!);
                }}
              >
                {t('画像を埋め込み')}
              </Button>
            </Center>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  });

  return (
    <Box w={'100%'} resize="horizontal" p={1}>
      <LightBox lightBoxContent={lightBoxContent} />

      <Box h="48px">
        <Input
          placeholder="search file"
          value={filenamesFilterText}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilenamesFilterText(event.target.value);
          }}
          w={'calc(100% - 3em)'}
        />
        <ReloadButton />
      </Box>

      <Flex>
        {currentDir}/
        <Spacer />
        <Box h="24px">
          <NewFileButton />
          <NewFolderButton />
          <UploadButton user={appState.user} />
        </Box>
        <hr />
      </Flex>
      <Box height={'100%'} w={'100%'} backgroundColor={'black'}>
        {/* TODO:ここの高さ計算をもっと的確に。 */}
        <Box
          height={'calc(100vh - 48px - 24px - 140px)'}
          overflowY="scroll"
          backgroundColor="white"
        >
          <UpToParentDirectoryButton
            currentTree={repository.state.currentTree}
          />
          {!createForm ? null : (
            <Input
              onBlur={() => setCreateForm(null)}
              onKeyPress={(e) => {
                if (e.key == 'Enter') {
                  e.preventDefault();
                  createFileOrDirectory(e);
                }
              }}
            />
          )}
          {filteredFiles.map((file) => {
            return file.type === 'file' ? (
              <FileEntry
                key={file.name}
                currentDir={currentDir}
                file={file}
                onClick={onClickFileEntry}
                onReload={reload}
                onEmbedImage={handleEmbedImage}
                onEmbedLink={handleEmbedLink}
              />
            ) : (
              <DirEntry
                key={file.name}
                currentDir={currentDir}
                file={file}
                onClick={onClickFileEntry}
                onReload={reload}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
