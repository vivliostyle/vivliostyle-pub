import React, {useEffect, useMemo, useRef} from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
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
  const monaco = useMonaco();
  const editorRef = useRef(null);

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

  function handleEditorDidMount(editor:any, monaco:any) {
    console.log('onMount');
    editorRef.current = editor; 
  }

  const display = currentFile.state.state == FileState.none || currentFile.state.state == FileState.busy ? 'block' : 'none';

  useEffect(()=>{
    const editor = editorRef.current as any;
    console.log('editor effect');
    if(editor) {
      console.log('editor set ctrl+s');
      editor.addAction({
        id: "saveDocument",
        label: "Save current document",
        keybindings: [monaco!.KeyMod.CtrlCmd|monaco!.KeyCode.KeyS],
        precondition: "editorTextFocus",
        run:()=>{
          console.log('editor saved');
        }
      });
      // editor.addCommand(monaco!.KeyMod.WinCtrl , () => {
      //   console.log('editor saved');
      //   // currentFile.commit();
      // })  
    }
  },[editorRef, monaco]);

  useEffect(()=>{
    if(currentFile.state.insertBuf != null) {
      const editor = editorRef.current as any;
      const pos = editor.getPosition();
      // Range(開始行,開始桁,終了行,終了桁)
      const range = new monaco!.Range(pos.lineNumber,pos.column,pos.lineNumber,pos.column);
      // console.log('monaco position', pos, range,currentFile.state.insertBuf);
      // カーソル位置に文字列を挿入
      editor!.executeEdits("",[{range , text: currentFile.state.insertBuf}]);
      // カーソル位置を画像タグの後ろに移動する この処理を入れない場合は画像タグ全体が選択された状態になる
      editor.setPosition({lineNumber:pos.lineNumber, column:pos.column + currentFile.state.insertBuf.length});
      // エディタにフォーカスする
      editor.focus();
      currentFile.insert(null);
    }

  },[currentFile, currentFile.state.insertBuf, monaco]);

  return (
    <UI.Box w="100%" h="100%" position="relative" overflow='hidden' onKeyDown={(e)=>{
        if((e.ctrlKey||e.metaKey) && e.key == 's') {
          e.preventDefault();
          e.stopPropagation();
          if(currentFile.state.state === FileState.modified){
            currentFile.commit();
          }
        }
      }}>
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
        onMount={handleEditorDidMount}
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
