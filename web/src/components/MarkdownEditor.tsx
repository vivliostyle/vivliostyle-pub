import React, { useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { isEditableFile } from '@middlewares/frontendFunctions';

export const MarkdownEditor = ({
  onModified = () => {},
}: {
  onModified?: (value: string) => void;
}) => {
  console.log('Editor');
  const repository = useRepositoryContext();

  const text = useMemo(()=>{
    if(repository.currentFile && isEditableFile(repository.currentFile.path)) {
        console.log('editable',repository.currentFile.path);
        return repository.currentFile?.text;
    }else{
        return '';
    }
  },[repository.currentFile]);

  const onChange = (value:string|undefined,event:any)=>{
    if(value) {
      console.log('editor.onChange');
      onModified(value);  
    }
  }

  return (
    <Editor
      height="100%"
      language="markdown"
      path={repository.currentFile?.path}
      options={{
        minimap: {enabled: false},
        wordWrap: 'on',
      }}
      onChange = {onChange}
      defaultValue={text}
    />
  );
};
