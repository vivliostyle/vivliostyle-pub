import {useEffect, useState} from 'react';
import {useRepositoryContext} from '@middlewares/useRepositoryContext';
import * as UI from '@components/ui';

export function ProjectExplorer() {
  console.log('Explorer');
  const repository = useRepositoryContext();
  const [filenamesFilterText, setFilenamesFilterText] = useState(''); // 絞り込みキーワード
  const [files,setFiles] = useState<string[]>([]);

  useEffect(() => {
    console.log('proj.files',repository.files);
    setFiles( repository.files.filter((f) => f.includes(filenamesFilterText)));
  }, [repository.files, filenamesFilterText]);
  
  return (
    <UI.Box w="180px" resize="horizontal" overflowX="hidden" p="4">
      <UI.Input
        placeholder="search file"
        value={filenamesFilterText}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setFilenamesFilterText(event.target.value);
        }}
      />

      <UI.Box h="calc(100vh - 200px)" overflowY="auto">
        {files.map((path) => (
          <UI.Container
            p={0}
            key={path}
            onClick={() => repository.selectFile(path)}
            cursor="default"
          >
            <UI.Text
              mt={3}
              fontSize="sm"
              fontWeight={path == repository.currentFile?.path ? 'bold' : 'normal'}
            >
              {path}
            </UI.Text>
          </UI.Container>
        ))}
      </UI.Box>
    </UI.Box>
  );
}
