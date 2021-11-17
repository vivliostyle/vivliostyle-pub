import {useRef, useEffect, useMemo, useState} from 'react';

import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { TYPE_PREVIEW_TARGET } from 'pages/github/[owner]/[repo]';
import { usePreviewSourceContext } from '@middlewares/usePreviewSourceContext';
import { User } from '@firebase/auth';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

interface PreviewerProps {
  target: TYPE_PREVIEW_TARGET;
  stylesheet?: string;
  user: User | null;
}

export const Previewer: React.FC<PreviewerProps> = ({
  stylesheet,
  user,
}) => {
  const repository = useRepositoryContext();
  const [contentReady,setContentReady] = useState<boolean>(false);
  const previewSource = usePreviewSourceContext();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Why Date.now()? -> disable viewer cache
  const viewerURL = useMemo(() => {
    setContentReady(false);
    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${previewSource.vpubPath}`
    if(previewSource.stylePath) url += `&style=${previewSource.stylePath}`
    return url
  },[previewSource.vpubPath, previewSource.stylePath]);

  useEffect(() => {
    console.log('rerendering',previewSource.path);//, previewSource.text,repository,user);
    if(!user || previewSource.text == null || previewSource.path == null ) return;
    console.log('iframe reload',viewerURL);
    setContentReady(true);
  }, [previewSource, stylesheet, repository, user, viewerURL]);

  return <iframe ref={iframeRef} src={contentReady?viewerURL:VIVLIOSTYLE_VIEWER_HTML_URL+'#x=empty.html'} width="100%" height="100%"></iframe>;
};
