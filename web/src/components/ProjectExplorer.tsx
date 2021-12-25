import React, {useCallback, useMemo, useState} from 'react';
import * as UI from '@components/ui';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {CurrentFile, useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {AddIcon, PlusSquareIcon, RepeatIcon} from '@chakra-ui/icons';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import upath from 'upath';
import {VFile} from 'theme-manager';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import FileEntry from './ProjectExplorerFileEntry';
import DirEntry from './ProjectExplorerDirEntry';

export function ProjectExplorer() {
  console.log('[Project Explorer]');
  const app = useAppContext();
  const log = useLogContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  const [filenamesFilterText, setFilenamesFilterText] = useState(''); // 絞り込みキーワード



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
  const onClick = (file: VFile) => {
    setCreateForm(null);

    console.log('proj.onclick', file);
    if (file.type === 'file') {
      // ファイル
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



  return (
    <UI.Box w={'100%'} resize="horizontal" p={1}>
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
            onClick={createFile}
          >
            <AddIcon w="1em" h="1em" p="0" />
          </UI.Button>
          <UI.Button
            title="new Folder"
            p="0"
            h="0"
            minH="1em"
            minW="1em"
            onClick={createDirectory}
          >
            <PlusSquareIcon w="1em" h="1em" p="0" />
          </UI.Button>
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
                ..
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
            return file.type === 'file' ?
            (<FileEntry key={file.name} currentDir={currentDir} file={file} onClick={onClick} onReload={reload} />):
            (<DirEntry key={file.name} file={file} onClick={onClick} onReload={reload} />)
          })}
        </UI.Box>
      </UI.Box>
    </UI.Box>
  );
}
