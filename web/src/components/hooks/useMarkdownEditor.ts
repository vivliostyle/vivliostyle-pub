import React, {useEffect, useMemo, useRef} from 'react';
import Editor, {useMonaco} from '@monaco-editor/react';
import {FileState} from '@middlewares/frontendFunctions';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';

export type OnModified = (value: string) => void;

export const useMarkdownEditor = (onModified: OnModified) => {
  const monaco = useMonaco();
  const editorRef = useRef(null);

  // Repositoryコンテキストのカレントファイルが変化したらリロード
  // CurrentFileコンテクストが変化してもリロードしない
  const currentFile = useCurrentFileContext();

  console.log('[Editor]' /* currentFile */);

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
    } else if (ext === 'html' || ext === 'xhtml') {
      return 'html';
    } else if (ext === 'css') {
      return 'css';
    } else {
      return 'plain';
    }
  }, [currentFile]);

  /**
   * コンポーネントがマウントされたらeditorRefにeditorインスタンスをセットする
   * 画像やリンクの挿入機能で使用する
   * @param editor
   * @param monaco
   */
  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
  }

  /**
   * ファイルの内容が編集された
   * @param value
   * @param event
   */
  const onChange = (value: string | undefined, event: any) => {
    currentFile.modify(value ?? '');
    onModified(value ?? '');
  };

  const display =
    currentFile.state.state == FileState.none ||
    currentFile.state.state == FileState.busy
      ? 'block'
      : 'none';

  // currentFileに挿入文字列が用意されていたらエディタのカーソル位置に挿入する
  useEffect(() => {
    if (currentFile.state.file && currentFile.state.insertBuf != null) {
      const editor = editorRef.current as any;
      const pos = editor.getPosition();
      // Range(開始行,開始桁,終了行,終了桁)
      const range = new monaco!.Range(
        pos.lineNumber,
        pos.column,
        pos.lineNumber,
        pos.column,
      );
      // console.log('monaco position', pos, range,currentFile.state.insertBuf);
      // カーソル位置に文字列を挿入
      editor!.executeEdits('', [{range, text: currentFile.state.insertBuf}]);
      // カーソル位置を画像タグの後ろに移動する この処理を入れない場合は画像タグ全体が選択された状態になる
      editor.setPosition({
        lineNumber: pos.lineNumber,
        column: pos.column + currentFile.state.insertBuf.length,
      });
      // エディタにフォーカスする
      editor.focus();
      currentFile.insert(null);
    }
  }, [currentFile, currentFile.state.insertBuf, monaco]);

  return {
    language,
    display,
    fileState: currentFile.state,
    onChange,
    handleEditorDidMount,
  };
};
