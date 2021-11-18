import {useMemo, useState} from 'react';
import {FileEntry, useRepositoryContext} from '@middlewares/useRepositoryContext';
import * as UI from '@components/ui';
import { usePreviewSourceContext } from '@middlewares/usePreviewSourceContext';

export function ProjectExplorer() {
  console.log('Explorer');
  const repository = useRepositoryContext();
  const previewSource = usePreviewSourceContext();
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

  const onClick = (file:FileEntry)=>{
    console.log('proj.onclick',file);
    if(file.type == 'blob') {
      repository.selectFile(file);
    }else if(file.type == 'tree') {
      repository.selectTree(file);
    }
  }

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
              fontWeight={file.path == repository.currentFile?.path ? 'bold' : 'normal'}
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
