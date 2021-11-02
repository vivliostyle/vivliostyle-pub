import React, {useCallback, useState, useEffect} from 'react';
import Editor, {Monaco} from '@monaco-editor/react';
import { CurrentFile } from 'pages/github/[owner]/[repo]';

const REFRESH_MS = 2000;

function useDefferedEffect(
  fn: () => void,
  args: React.DependencyList,
  duration: number,
) {
  useEffect(() => {
    const timer = setTimeout(() => fn(), duration);
    return () => {
      clearTimeout(timer);
    };
  }, args);
}

export const MarkdownEditor = ({
  currentFile = undefined,
  onModified = () => {},
  onUpdate = () => {},
}: {
  currentFile?:CurrentFile;
  onModified?: (value: string) => void;
  onUpdate?: (value: string) => void;
}) => {
  const [currentValue, setCurrentValue] = useState(() => currentFile?.text);

  useDefferedEffect(
    () => {
      if(currentValue){
        onUpdate(currentValue);
      }
    },
    [currentValue],
    REFRESH_MS,
  );

  // const editorDidMount: EditorDidMount = useCallback(
  //   (getEditorValue, monaco) => {
  //     monaco.onDidChangeModelContent(() => {
  //       const value = getEditorValue();
  //       setCurrentValue(value);
  //       onModified(value);
  //     });
  //   },
  //   [onModified],
  // );

  const onChange = (value:string|undefined,event:any)=>{
    if(value) {
      console.log('editor.onChange');
      setCurrentValue(value);
      onModified(value);  
    }
  }

  return (
    <Editor
      height="100%"
      language="markdown"
      value={currentFile?.text}
      path={currentFile?.path}
      options={{
        minimap: {enabled: false},
        wordWrap: 'on',
      }}
      onChange = {onChange}
    />
  );
};
