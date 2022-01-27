import {useRef, useEffect, useState, memo} from 'react';

import {usePreviewSourceContext} from '@middlewares/contexts/usePreviewSourceContext';
import { useCurrentThemeContext } from '@middlewares/contexts/useCurrentThemeContext';
import React from 'react';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

interface PreviewerProps {}

export const Previewer: React.FC<PreviewerProps> = ({ }) => {
  const currentTheme = useCurrentThemeContext();
  const previewSource = usePreviewSourceContext();

  const [currentPath,setCurrentPath] = useState<string|null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(()=>{

    const iframeWindow = iframeRef.current?.contentWindow;
    if( ! iframeWindow){
      return;
    }

    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${
      previewSource.vpubPath
    }`;
    const stylePath = currentTheme.theme?.getStylePath()
      ? '/vpubfs/'+currentTheme.theme?.getStylePath()
      : null;
    if (stylePath) {
      url += `&style=${stylePath}`;
    }else{
      console.log('no stylesheet');
    }
    if(currentPath != previewSource.vpubPath){
      // 対象のファイルが変更された
      iframeWindow.location.href = previewSource.vpubPath ? url : VIVLIOSTYLE_VIEWER_HTML_URL + '#x=empty.html';
      setCurrentPath(previewSource.vpubPath);
    }else{
      // 対象のファイルは変わらず、テキストだけ変更された
      iframeWindow.location.reload();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[previewSource, currentTheme.theme]);

  return (
    <ViewerFrame iframeRef={iframeRef}></ViewerFrame>
  );
};

// iframeを作りなおすとページが先頭に戻ってしまうため、無駄なレンダリングを防ぐためにメモ化する
type ViewerFrameProps = {iframeRef:any;};
const ViewerFrame = memo<ViewerFrameProps>(function useViewerFrame({iframeRef}) {
  return <iframe ref={iframeRef} width="100%" height="100%"></iframe>;
});