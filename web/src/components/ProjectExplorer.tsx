import {useMemo, useState} from 'react';
import * as UI from '@components/ui';
import {FileEntry, useRepositoryContext} from '@middlewares/useRepositoryContext';
import { useCurrentFileContext } from '@middlewares/useCurrentFileContext';

export function ProjectExplorer() {
  console.log('[Project Explorer]');
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();

  const [filenamesFilterText, setFilenamesFilterText] = useState(''); // 絞り込みキーワード

  // 絞り込み後のファイルリスト
  const filteredFiles = useMemo(() => {
    console.log('proj.files',repository.files);
    return repository.files.filter((f) => f.path.includes(filenamesFilterText));
  }, [repository.files, filenamesFilterText]);
  
  // 表示用のカレントディレクトリ
  const currentDir = useMemo(()=>{
    let path = repository.currentTree.map(f=>f.path).join('/');
    // 流すぎるパスは省略
    if(path.length > 15) { path = '...'+path.slice(-15); } 
    return path;
  },[repository.currentTree]);

  /**
   * ファイルまたはディレクトリが選択された
   * blob,treeはGit用語
   * @param file 
   */
  const onClick = (file:FileEntry)=>{
    console.log('proj.onclick',file);
    if(file.type == 'blob') { // ファイル
      repository.selectFile(file,new Date().getTime());
    }else if(file.type == 'tree') { // ディレクトリ
      repository.selectTree(file);
    }
  }

  /**
   * 親ディレクトリへ移動する
   */
  const upTree =()=>{
    repository.selectTree('..');
  }

  return (
    <UI.Box w={'100%'} resize="horizontal" p={1}>
      <UI.Input
        placeholder="search file"
        value={filenamesFilterText}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setFilenamesFilterText(event.target.value);
        }}
      />
      <UI.Box>
        {currentDir}/
        <hr />
      </UI.Box>
      <UI.Box height={'100%'} w={'100%'} backgroundColor={'black'}>
        <UI.Box height={'100vh'} overflowY="scroll" backgroundColor="white">
        {repository.currentTree.length > 0?(
          <UI.Container p={0} onClick={upTree} cursor="default">
            <UI.Text mt={3} fontSize="sm">..</UI.Text>
          </UI.Container>
        ):null}
        {filteredFiles.map((file) => (
          <UI.Container
            paddingInlineStart={1}
            key={file.path}
            onClick={()=>{onClick(file);}}
            cursor="pointer"
          >
            <UI.Text
              mt={1}
              fontSize="sm"
              fontWeight={file.path == currentFile?.path ? 'bold' : 'normal'}
            >
              {file.path}{file.type=='tree'?'/':''}
            </UI.Text>
          </UI.Container>
        ))}
        </UI.Box>
      </UI.Box>
    </UI.Box>
  );
}
