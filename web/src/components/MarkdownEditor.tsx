import React, {useMemo} from 'react';
import Editor from '@monaco-editor/react';
import {FileState, getExt, isEditableFile} from '@middlewares/frontendFunctions';
import { useCurrentFileContext } from '@middlewares/useCurrentFileContext';
import * as UI from '@components/ui';
import { usePreviewSourceContext } from '@middlewares/usePreviewSourceContext';


export const MarkdownEditor = ({
  onModified = () => {},
}: {
  onModified?: (value: string) => void;
}) => {
  // Repositoryコンテキストのカレントファイルが変化したらリロード
  // CurrentFileコンテクストが変化してもリロードしない
  const currentFile = useCurrentFileContext();
  const previewSource = usePreviewSourceContext();

  console.log('[Editor]', currentFile);

  /**
   * テキストの初期値
   */
  // const text = useMemo(() => {
  //   if (isEditableFile(currentFile.file?.path)) {
  //     console.log('editable', currentFile.file?.path,currentFile.text);
  //     return currentFile.text;
  //   } else {
  //     return '';
  //   }
  // }, [repository.currentFile]);

  /**
   * シンタックスハイライティング用のファイル種別
   * 自動判別するのでなくても良いような気がするが。
   */
  const language = useMemo(() => {
    const ext = getExt(currentFile.file?.path);
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
    onModified(value ?? '');
    currentFile.modify(value??'');
    // previewSource.modifyText(value ?? null);
  };

  const display = currentFile.state == FileState.none ? 'block' : 'none';

  return (
    <UI.Box w="100%" h="100%" position="relative">
    <Editor
      height="100%"
      language={language}
      path={currentFile.file?.path}
      options={{
        minimap: {enabled: false},
        wordWrap: 'on',
      }}
      onChange={onChange}
      value={currentFile.text}
    />
    <UI.Box display={display}  position="absolute" w="100%" h="100%" top="0" left="0" textAlign="center" verticalAlign="center" backgroundColor="rgb(0,0,0,0.5)" lineHeight="100%">
    <UI.Spinner size="xl" emptyColor="gray.200" color="blue.500" mt="calc(50% - 3rem)" />
    </UI.Box>
    </UI.Box>
  );
};
