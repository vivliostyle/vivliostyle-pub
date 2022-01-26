import React, {useCallback, useMemo, useState} from 'react';
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

/**
 * プロジェクトエクスプローラー
 * @returns
 */
export function ProjectExplorer() {
  console.log('[Project Explorer]');
  const app = useAppContext();
  const repository = useRepositoryContext();
  const log = useLogContext();

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  const [filenamesFilterText, setFilenamesFilterText] = useState(''); // 絞り込みキーワード

  const [lightBoxContent, setLightBoxContent] = useState<{
    name: string;
    data: string;
  } | null>(null); // ライトボックスに表示する画像

  // 絞り込み後のファイルリスト
  const filteredFiles = useMemo(() => {
    // console.log('proj.files',repository.files);
    return repository.files.filter((f) => f.name.includes(filenamesFilterText));
  }, [repository.files, filenamesFilterText]);

  // 表示用のカレントディレクトリ
  const currentDir = useMemo(() => {
    let path = repository.currentTree.map((f) => f.name).join('/');
    // 流すぎるパスは省略
    if (path.length > 15) {
      path = '...' + path.slice(-15);
    }
    return path;
  }, [repository.currentTree]);

  /**
   * ファイルまたはディレクトリが選択された
   * blob,treeはGit用語
   * @param file
   */
  const onClick = async (file: VFile) => {
    setCreateForm(null);

    console.log('proj.onclick', file);
    if (file.type === 'file') {
      // 画像ファイルだったらライトボックスで表示する
      if (isImageFile(file.name)) {
        const srcPath = upath.join(currentDir, file.name);

        // PreviewのiframeにしかServiceWorkerが設定されていないため Application Cacheにアクセスできないので
        // 代替手段としてDataURIを使用している
        // TODO: このページからはApplication Cacheにアクセスできるようにする
        let content = await getFileContentFromGithub(
          repository.owner!,
          repository.repo!,
          repository.branch!,
          srcPath,
          app.user!,
        );
        if (!content) {
          log.error(
            `ファイルの取得に失敗しました。GitHubで確認してください。: ${srcPath}`,
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
          log.error(`不明な画像ファイル形式です: ${srcPath}`, 3000);
          return;
        }
        const data = content ? `data:image/${type}${content}` : '';
        setLightBoxContent({name: srcPath, data});
        return;
      }

      // ファイル 多重呼び出しをキャンセルするためにタイムスタンプも渡す。あまり役に立ってない?
      repository.selectFile(file, new Date().getTime());
    } else if (file.type === 'dir') {
      // ディレクトリ
      repository.selectTree(file);
    }
  };

  /**
   * 親ディレクトリへ移動する
   */
  const upTree = () => {
    repository.selectTree('..');
    setCreateForm(null);
  };

  /**
   * リポジトリからファイルリストを取得しなおす
   * TODO: GitHubのリポジトリに直接変更を加えた場合にリロードしてもらうようマニュアルに追加
   */
  const reload = useCallback(async () => {
    console.log('ProjectExplorer reload', currentDir);
    repository.selectTree('.');
  }, [repository, currentDir]);

  // ファイル名入力フォームの表示フラグ 種別兼用 'file':新規ファイル,'dir':新規ディレクトリ,null:非表示
  const [createForm, setCreateForm] = useState<'file' | 'dir' | null>(null);
  const createFile = () => {
    setCreateForm('file');
  };

  const createDirectory = () => {
    setCreateForm('dir');
  };

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

  const onCloseLightBox = () => {
    setLightBoxContent(null);
  };

  return (
    <UI.Box w={'100%'} resize="horizontal" p={1}>
      <UI.Modal
        isOpen={lightBoxContent != null}
        onClose={onCloseLightBox}
        isCentered
        size={'6xl'}
      >
        <UI.ModalOverlay />
        <UI.ModalContent>
          <UI.ModalHeader>{lightBoxContent?.name}</UI.ModalHeader>
          <UI.ModalCloseButton />
          <UI.ModalBody backgroundColor={'gray'}>
            <Center>
              <UI.Image src={lightBoxContent?.data} objectFit={'scale-down'} />
            </Center>
          </UI.ModalBody>
        </UI.ModalContent>
      </UI.Modal>

      <UI.Box h="48px">
        <UI.Input
          placeholder="search file"
          value={filenamesFilterText}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilenamesFilterText(event.target.value);
          }}
          w={'calc(100% - 3em)'}
        />
        <UI.Button textAlign="right" onClick={reload}>
          <RepeatIcon />
        </UI.Button>
      </UI.Box>

      <UI.Flex>
        {currentDir}/
        <UI.Spacer />
        <UI.Box h="24px">
          <UI.Button
            title="new File"
            p="0"
            h="0"
            minH="1em"
            minW="1em"
            backgroundColor={'transparent'}
            onClick={createFile}
          >
            <UI.Icon as={VscNewFile} w="1em" h="1em" p="0" />
          </UI.Button>
          <UI.Button
            title="new Folder"
            p="0"
            h="0"
            minH="1em"
            minW="1em"
            backgroundColor={'transparent'}
            onClick={createDirectory}
          >
            <UI.Icon as={VscNewFolder} w="1em" h="1em" p="0" />
          </UI.Button>
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
            user={app.user}
            isOpen={isOpenFileUploadModal}
            onOpen={onOpenFileUploadModal}
            onClose={onCloseFileUploadModal}
            title="Upload File"
            accept="*"
          />
        </UI.Box>
        <hr />
      </UI.Flex>
      <UI.Box height={'100%'} w={'100%'} backgroundColor={'black'}>
        <UI.Box
          height={'calc(100vh - 48px - 24px - 140px)'}
          overflowY="scroll"
          backgroundColor="white"
        >
          {/* TODO:ここの高さ計算をもっと的確に。 */}
          {repository.currentTree.length > 0 ? (
            <UI.Container p={0} onClick={upTree} cursor="pointer">
              <UI.Text mt={3} fontSize="sm">
                <UI.Icon as={CgCornerLeftUp} /> ..
              </UI.Text>
            </UI.Container>
          ) : null}
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
