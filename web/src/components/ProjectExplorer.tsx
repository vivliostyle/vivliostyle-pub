import React, {memo, useCallback, useMemo, useState} from 'react';
import * as UI from '@components/ui';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {RepeatIcon} from '@chakra-ui/icons';
import upath from 'upath';
import {VFile} from 'theme-manager';
import FileEntry from './ProjectExplorerFileEntry';
import DirEntry from './ProjectExplorerDirEntry';
import {VscArrowUp, VscNewFile, VscNewFolder} from 'react-icons/vsc';
import {CgCornerLeftUp} from 'react-icons/cg';
import {
  getFileContentFromGithub,
  isImageFile,
} from '@middlewares/frontendFunctions';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {Center, useDisclosure} from '@chakra-ui/react';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {FileUploadModal} from './FileUploadModal';
import {t} from 'i18next';
import {User} from 'firebase/auth';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';

/**
 * プロジェクトエクスプローラーコンポーネント
 * @returns
 */
export function ProjectExplorer() {
  console.log('[Project Explorer]');
  const app = useAppContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();
  const log = useLogContext();

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  // 絞り込みキーワード
  const [filenamesFilterText, setFilenamesFilterText] = useState('');

  // ファイル名入力フォームの表示フラグ 種別兼用 'file':新規ファイル,'dir':新規ディレクトリ,null:非表示
  const [createForm, setCreateForm] = useState<'file' | 'dir' | null>(null);

  // ライトボックスの表示フラグ
  const [lightBoxContent, setLightBoxContent] = useState<{
    file: VFile;
    data: string;
  } | null>(null); // ライトボックスに表示する画像

  // 絞り込み後のファイルリスト
  const filteredFiles = useMemo(() => {
    // console.log('proj.files',repository.state.files);
    return repository.state.files.filter((f) =>
      f.name.includes(filenamesFilterText),
    );
  }, [repository.state.files, filenamesFilterText]);

  // 表示用のカレントディレクトリ
  const currentDir = useMemo(() => {
    console.log('change currentDir');
    let path = repository.state.currentTree.map((f) => f.name).join('/');
    // 長すぎるパスは省略
    if (path.length > 15) {
      path = '...' + path.slice(-15);
    }
    return path;
  }, [repository.state.currentTree]);

  /**
   * ファイルまたはディレクトリが選択された
   * blob,treeはGit用語
   * @param file
   */
  const onClick = async (file: VFile) => {
    setCreateForm(null);

    if (file.type === 'file') {
      // 画像ファイルだったらライトボックスで表示する
      if (isImageFile(file.name)) {
        const srcPath = upath.join(currentDir, file.name);

        // PreviewのiframeにしかServiceWorkerが設定されていないため Application Cacheにアクセスできないので
        // 代替手段としてDataURIを使用している
        // TODO: このページからはApplication Cacheにアクセスできるようにする
        let content = await getFileContentFromGithub(
          repository.state.owner!,
          repository.state.repo!,
          repository.state.branch!,
          srcPath,
          app.state.user!,
        );
        if (!content) {
          log.error(
            t('ファイルの取得に失敗しました。GitHubで確認してください。', {
              filepath: srcPath,
            }),
            3000,
          );
          return;
        }
        let type = '';
        const ext = upath.extname(file.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          type = 'jpeg;base64,';
        } else if (ext === '.png') {
          type = 'png;base64,';
        } else if (ext === '.gif') {
          type = 'gif;base64,';
        } else if (ext === '.svg') {
          type = 'svg+xml,';
          content = encodeURIComponent(content);
        } else {
          log.error(t('不明な画像ファイル形式です', {fileptah: srcPath}), 3000);
          return;
        }
        const data = content ? `data:image/${type}${content}` : '';
        setLightBoxContent({file, data});
        return;
      }
      // 画像でなければエディタで編集できるよう選択する
      repository.selectFile(file);
    } else if (file.type === 'dir') {
      // ディレクトリ
      repository.selectTree(file);
    }
  };

  /**
   * リポジトリからファイルリストを取得しなおす
   * 複数のコンポーネントから呼び出されるので独立したコールバックメソッドとして定義
   * TODO: GitHubのリポジトリに直接変更を加えた場合にリロードしてもらうようマニュアルに追加
   */
  const reload = useCallback(async () => {
    console.log('ProjectExplorer reload', currentDir);
    repository.selectTree('.');
  }, [repository, currentDir]);

  const createFileOrDirectory = (e: any) => {
    const name = e.target.value;
    if (!name || name.length === 0) {
      setCreateForm(null);
      return;
    }
    if (createForm === 'file') {
      repository.createFile(
        upath.join(currentDir, name),
        new File(['\n'], name),
      );
    } else if (createForm === 'dir') {
      const filePath = upath.join(currentDir, name, '.gitkeep');
      repository.createFile(filePath, new File(['\n'], '.gitkeep'));
    }
    setCreateForm(null);
  };

  /**
   * 親ディレクトリへ移動するボタン
   */
  const UpToParentDirectoryButton = memo(
    function upToParentDirectoryButton(props: {currentTree: VFile[]}) {
      if (props.currentTree.length > 0) {
        return (
          <UI.Container
            p={0}
            onClick={() => {
              repository.selectTree('..');
              setCreateForm(null);
            }}
            cursor="pointer"
          >
            <UI.Text mt={3} fontSize="sm">
              <UI.Icon as={CgCornerLeftUp} /> ..
            </UI.Text>
          </UI.Container>
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
      <UI.Button
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
        <UI.Icon as={VscNewFile} w="1em" h="1em" p="0" />
      </UI.Button>
    );
  });

  /**
   * 新規フォルダ作成ボタン
   */
  const NewFolderButton = memo(function newFolderButton() {
    return (
      <UI.Button
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
        <UI.Icon as={VscNewFolder} w="1em" h="1em" p="0" />
      </UI.Button>
    );
  });

  /**
   * ファイルアップロードボタン
   */
  const UploadButton = memo(function uploadButton(props: {user: User | null}) {
    return (
      <>
        <UI.Button
          title="upload file"
          p="0"
          h="0"
          minH="1em"
          minW="1em"
          backgroundColor={'transparent'}
          onClick={onOpenFileUploadModal}
        >
          <UI.Icon
            as={VscArrowUp}
            w="1em"
            h="1em"
            p="0"
            border="solid 1px black"
          />
        </UI.Button>
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
      <UI.Button textAlign="right" onClick={reload}>
        <RepeatIcon />
      </UI.Button>
    );
  });
  /**
   * リンクタグの埋め込み
   * @param name ディレクトリ名を含まないファイル名 TODO: VFileオブジェクトのほうが良いかも
   */
   const handleEmbedLink = useCallback((file:VFile)=>{
     if(currentFile.state.file) {
      const editingPath = upath.dirname(currentFile.state.file.path);
      currentFile.insert(`[${upath.trimExt(file.name)}](${upath.relative(editingPath, file.path)})`);
     }
  },[currentFile]);
  /**
   * 画像タグの埋め込み
   * @param file 画像ファイル
   */
  const handleEmbedImage = useCallback(
    (file: VFile) => {
      if(currentFile.state.file) {
        console.log('embedImage', file.path, currentFile.state.file?.path);
        const editingPath = upath.dirname(currentFile.state.file.path);
        currentFile.insert(`![Fig. ${file.name}](${upath.relative(editingPath, file.path)})`);  
      }
    },
    [currentFile],
  );

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
      <UI.Modal
        isOpen={lightBoxContent != null}
        onClose={() => {
          setLightBoxContent(null);
        }}
        isCentered
        size={'xl'}
      >
        <UI.ModalOverlay />
        <UI.ModalContent>
          <UI.ModalHeader>{lightBoxContent?.file.name}</UI.ModalHeader>
          <UI.ModalCloseButton />
          <UI.ModalBody backgroundColor={'gray'}>
            <Center>
              <UI.Image src={lightBoxContent?.data} objectFit={'scale-down'} />
            </Center>
          </UI.ModalBody>
          <UI.ModalFooter backgroundColor={'gray'}>
            <Center>
              <UI.Button
                onClick={() => {
                  setLightBoxContent(null);
                  console.log('embedImage lightbox', lightBoxContent?.file);
                  handleEmbedImage(lightBoxContent?.file!);
                }}
              >
                {t('画像を埋め込み')}
              </UI.Button>
            </Center>
          </UI.ModalFooter>
        </UI.ModalContent>
      </UI.Modal>
    );
  });

  return (
    <UI.Box w={'100%'} resize="horizontal" p={1}>
      <LightBox lightBoxContent={lightBoxContent} />

      <UI.Box h="48px">
        <UI.Input
          placeholder="search file"
          value={filenamesFilterText}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilenamesFilterText(event.target.value);
          }}
          w={'calc(100% - 3em)'}
        />
        <ReloadButton />
      </UI.Box>

      <UI.Flex>
        {currentDir}/
        <UI.Spacer />
        <UI.Box h="24px">
          <NewFileButton />
          <NewFolderButton />
          <UploadButton user={app.state.user} />
        </UI.Box>
        <hr />
      </UI.Flex>
      <UI.Box height={'100%'} w={'100%'} backgroundColor={'black'}>
        {/* TODO:ここの高さ計算をもっと的確に。 */}
        <UI.Box
          height={'calc(100vh - 48px - 24px - 140px)'}
          overflowY="scroll"
          backgroundColor="white"
        >
          <UpToParentDirectoryButton
            currentTree={repository.state.currentTree}
          />
          {!createForm ? null : (
            <UI.Input
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
                onClick={onClick}
                onReload={reload}
                onEmbedImage={handleEmbedImage}
                onEmbedLink={handleEmbedLink}
              />
            ) : (
              <DirEntry
                key={file.name}
                currentDir={currentDir}
                file={file}
                onClick={onClick}
                onReload={reload}
              />
            );
          })}
        </UI.Box>
      </UI.Box>
    </UI.Box>
  );
}
