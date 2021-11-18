import {useEffect, useState} from 'react';
import {FileEntry, useRepositoryContext} from '@middlewares/useRepositoryContext';
import * as UI from '@components/ui';

export function ProjectExplorer() {
  console.log('Explorer');
  const repository = useRepositoryContext();
  const [filenamesFilterText, setFilenamesFilterText] = useState(''); // 絞り込みキーワード
  const [files,setFiles] = useState<FileEntry[]>([]);
  const [currentDir,setCurrentDir] = useState<string>('');

  useEffect(() => {
    console.log('proj.files',repository.files);
      const filteredFiles = repository.files.filter((f) => f.path.includes(filenamesFilterText));
    setFiles( filteredFiles );
  }, [repository.files, filenamesFilterText]);
  
  useEffect(()=>{
    let path = repository.currentTree.map(f=>f.path).join('/');
    if(path.length > 15) { path = '...'+path.slice(-15); } 
    setCurrentDir(path);
  },[repository.currentTree]);

  const onClick = (file:FileEntry)=>{
    if(file.type == 'blob') {
      repository.selectFile(file.path);
    }else if(file.type == 'tree') {
      repository.selectTree(file);
    }
  }

  const upTree =()=>{
    repository.selectTree('..');
  }

  return (
    <UI.Box w="180px" resize="horizontal" overflowX="hidden" p="4">
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
      <UI.Box h="calc(100vh - 200px)" overflowY="auto">
          <UI.Container p={0} onClick={upTree} cursor="default">
            <UI.Text mt={3} fontSize="sm">..</UI.Text>
          </UI.Container>
        {files.map((file) => (
          <UI.Container
            p={0}
            key={file.path}
            onClick={()=>{onClick(file);}}
            cursor="default"
          >
            <UI.Text
              mt={3}
              fontSize="sm"
              fontWeight={file.path == repository.currentFile?.path ? 'bold' : 'normal'}
            >
              {file.path}{file.type=='tree'?' /':''}
            </UI.Text>
          </UI.Container>
        ))}
      </UI.Box>
    </UI.Box>
  );
}
