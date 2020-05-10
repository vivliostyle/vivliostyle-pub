import React, {useCallback, useState, useEffect} from 'react';
import Editor, {EditorDidMount} from '@monaco-editor/react';

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
  value = '',
  onModified = () => {},
  onUpdate = () => {},
}: {
  value?: string;
  onModified?: (value: string) => void;
  onUpdate?: (value: string) => void;
}) => {
  const [currentValue, setCurrentValue] = useState(() => value);

  useDefferedEffect(
    () => {
      onUpdate(currentValue);
    },
    [currentValue],
    3000,
  );

  const editorDidMount: EditorDidMount = useCallback(
    (getEditorValue, monaco) => {
      monaco.onDidChangeModelContent(() => {
        const value = getEditorValue();
        setCurrentValue(value);
        onModified(value);
      });
    },
    [],
  );

  return (
    <Editor
      height="80vh"
      language="markdown"
      value={value}
      options={{
        minimap: {enabled: false},
      }}
      editorDidMount={editorDidMount}
    />
  );
};
