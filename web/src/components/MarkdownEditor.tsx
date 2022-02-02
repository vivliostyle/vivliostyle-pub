import React, {useMemo} from 'react';
import Editor from '@monaco-editor/react';
import {
  FileState,
} from '@middlewares/frontendFunctions';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import * as UI from '@components/ui';

export const MarkdownEditor = ({
  onModified = () => {},
}: {
  onModified?: (value: string) => void;
}) => {
  // Repositoryコンテキストのカレントファイルが変化したらリロード
  // CurrentFileコンテクストが変化してもリロードしない
  const currentFile = useCurrentFileContext();

  console.log('[Editor]', /* currentFile */);

  /**
   * シンタックスハイライティング用のファイル種別
   * 自動判別するのでなくても良いような気がする
   */
  const language = useMemo(() => {
    const ext = currentFile.state.ext;
    if (ext === 'md') {
      return 'markdown';
    } else if (ext === 'js') {
      return 'javascript';
    } else if (ext === 'html') {
      return 'html';
    } else if (ext === 'css') {
      return 'css';
    } else {
      return 'plain';
    }
  }, [currentFile]);

  /**
   * ファイルの内容が編集された
   * @param value
   * @param event
   */
  const onChange = (value: string | undefined, event: any) => {
    currentFile.modify(value ?? '');
    onModified(value??'');
  };

  const display = currentFile.state.state == FileState.none || currentFile.state.state == FileState.busy ? 'block' : 'none';

  return (
    <UI.Box w="100%" h="100%" position="relative" overflow='hidden'>
      <Editor
        height="100%"
        language={language}
        path={currentFile.state.file?.name}
        options={{
          minimap: {enabled: false},
          wordWrap: 'on',
        }}
        onChange={onChange}
        value={currentFile.state.text}
      />
      <UI.Box
        display={display}
        position="absolute"
        w="100%"
        h="100%"
        top="0"
        left="0"
        textAlign="center"
        verticalAlign="center"
        backgroundColor="rgb(0,0,0,0.5)"
        lineHeight="100%"
      >
        {currentFile.state.file == null ? null : (
          <UI.Spinner
            size="xl"
            emptyColor="gray.200"
            color="blue.500"
            mt="calc(50% - 3rem)"
          />
        )}
      </UI.Box>
    </UI.Box>
  );
};
