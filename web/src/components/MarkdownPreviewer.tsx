import {useRef, useEffect, useState, memo} from 'react';

import {usePreviewSourceContext} from '@middlewares/contexts/usePreviewSourceContext';
import {useCurrentThemeContext} from '@middlewares/contexts/useCurrentThemeContext';
import React from 'react';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

interface PreviewerProps {}

export const Previewer: React.FC<PreviewerProps> = ({}) => {
  const currentTheme = useCurrentThemeContext();
  const previewSource = usePreviewSourceContext();

  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [stylePath, setStylePath] = useState<string|null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // console.log('[MarkdownPreviewer] update',currentTheme.state.theme?.name);
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) {
      return;
    }

    if (previewSource.vpubPath == null) {
      // 対象となるファイルが選択されていない
      // 初期状態、ブランチ切り替えやリポジトリ切り替えでこの状態になる
      iframeWindow.location.href = '/viewer/empty.html';
    } else if (currentPath != previewSource.vpubPath || stylePath != currentTheme.state.stylePath) {
      // 対象のファイルが変更された
      let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${
        previewSource.vpubPath
      }`;
      const stylePath = currentTheme.state.theme?.getStylePath()
        ? '/vpubfs/' + currentTheme.state.theme?.getStylePath()
        : null;
      if (stylePath) {
        url += `&style=${stylePath}`;
      } else {
        console.log('[MarkdownPreviewer] no stylesheet');
      }
      // console.log('[MarkdownPreviewer] preview href', url);
      iframeWindow.location.href = url;
      setCurrentPath(previewSource.vpubPath);
      setStylePath(currentTheme.state.stylePath);
    } else {
      // console.log('[MarkdownPreviewer] preview reload',iframeWindow.location.href);
      // 対象のファイルは変わらず、テキストだけ変更された
      iframeWindow.location.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSource, currentTheme]);

  return <ViewerFrame iframeRef={iframeRef}></ViewerFrame>;
};

// iframeを作りなおすとページが先頭に戻ってしまうため、無駄なレンダリングを防ぐためにメモ化する
type ViewerFrameProps = {iframeRef: any};
const ViewerFrame = memo<ViewerFrameProps>(function useViewerFrame({
  iframeRef,
}) {
  return <iframe ref={iframeRef} width="100%" height="100%"></iframe>;
});
