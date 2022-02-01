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
    if (currentFile.ext === 'md') {
      return 'markdown';
    } else if (currentFile.ext === 'js') {
      return 'javascript';
    } else if (currentFile.ext === 'html') {
      return 'html';
    } else if (currentFile.ext === 'css') {
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

  const display = currentFile.state == FileState.none || currentFile.state == FileState.busy ? 'block' : 'none';

  return (
    <UI.Box w="100%" h="100%" position="relative" overflow='hidden'>
      <Editor
        height="100%"
        language={language}
        path={currentFile.file?.name}
        options={{
          minimap: {enabled: false},
          wordWrap: 'on',
        }}
        onChange={onChange}
        value={currentFile.text}
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
        {currentFile.file == null ? null : (
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
