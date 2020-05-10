import {useRef, useEffect} from 'react';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL ||
  'http://localhost:9990/viewer/index.html';

export function Viewer() {
  const iframeRef = useRef<HTMLIFrameElement>();

  useEffect(() => {
    const iframe = iframeRef.current;
    console.log(iframe.contentWindow);
  });

  return (
    <iframe
      ref={iframeRef}
      src={VIVLIOSTYLE_VIEWER_HTML_URL}
      width="1000"
    ></iframe>
  );
}
