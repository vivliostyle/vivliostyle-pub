import {useRef, useEffect, useMemo, useState} from 'react';

import {useRepositoryContext} from '@middlewares/useRepositoryContext';
import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {useAppContext} from '@middlewares/useAppContext';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

interface PreviewerProps {}

export const Previewer: React.FC<PreviewerProps> = ({}) => {
  const app = useAppContext();
  const repository = useRepositoryContext();
  const [contentReady, setContentReady] = useState<boolean>(false);
  const previewSource = usePreviewSourceContext();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const viewerURL = useMemo(() => {
    // Why Date.now()? -> disable viewer cache
    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${
      previewSource.vpubPath
    }`;
    if (previewSource.stylePath) url += `&style=${previewSource.stylePath}`;
    return url;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSource, previewSource.stylePath]);

  useEffect(() => {
    console.log('rerendering', previewSource.path); //, previewSource.text,repository,user);
    if (!app.user || previewSource.text == null || previewSource.path == null)
      return;
    console.log('iframe reload', viewerURL);
    setContentReady(true);

    if( iframeRef.current) { // TODO: 描画完了するまでは再描画しない
      iframeRef.current!.onload = () => {
        console.log("読込完了"); // 実際にはonloadの後にvivliostyle.jsの処理が走るのでどうやって検知するか。
      };  
    }

  }, [app.user, previewSource, repository, viewerURL]);

  return (
    <iframe
      ref={iframeRef}
      src={
        contentReady ? viewerURL : VIVLIOSTYLE_VIEWER_HTML_URL + '#x=empty.html'
      }
      width="100%"
      height="100%"
    ></iframe>
  );
};
