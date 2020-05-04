import React, { useCallback, useState, useEffect } from 'react';
import Editor, { EditorDidMount } from '@monaco-editor/react';

export const MarkdownEditor = ({
  value = '',
  onModified = () => {},
  onUpdate = () => {},
}: {
  value?: string;
  onModified?: (value: string) => void;
  onUpdate?: (value: string) => void;
}) => {
  const [currentValue, setCurrentValue] = useState(() => value);
  useEffect(() => {
    const id = setTimeout(() => {
      onUpdate(currentValue);
    }, 3000);
    return () => {
      clearTimeout(id);
    };
  }, [currentValue]);
  const editorDidMount: EditorDidMount = useCallback(
    (getEditorValue, monaco) => {
      monaco.onDidChangeModelContent(() => {
        const value = getEditorValue();
        setCurrentValue(value);
        onModified(value);
      });
    },
    []
  );

  return (
    <Editor
      height="80vh"
      language="markdown"
      value={value}
      options={{
        minimap: { enabled: false },
      }}
      editorDidMount={editorDidMount}
    />
  );
};
