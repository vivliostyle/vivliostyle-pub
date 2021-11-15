import React from 'react';
import Editor from '@monaco-editor/react';
import { CurrentFile } from 'pages/github/[owner]/[repo]';

export const MarkdownEditor = ({
  currentFile = undefined,
  onModified = () => {},
}: {
  currentFile?:CurrentFile;
  onModified?: (value: string) => void;
}) => {

  let text = currentFile?.text;

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
      path={currentFile?.path}
      options={{
        minimap: {enabled: false},
        wordWrap: 'on',
      }}
      onChange = {onChange}
      defaultValue={text}
    />
  );
};
