import {useRef, useEffect, useState} from 'react';
import unified from 'unified';
import markdown from 'remark-parse';
import remark2rehype from 'remark-rehype';
import html from 'rehype-stringify';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL ||
  '/viewer/index.html#x=/vpubfs/index.html';

export const Viewer: React.FC<{body: string}> = ({body}) => {
  const iframeRef = useRef<HTMLIFrameElement>();

  useEffect(() => {
    const processor = unified().use(markdown).use(remark2rehype).use(html);
    const result = String(processor.processSync(body));
    console.log(result);
    caches.open('vpubfs').then((cache) => {
      cache.put(
        '/vpubfs/index.html',
        new Response(result, {
          headers: {'content-type': 'text/html'},
        }),
      );
      reload();
    });
  }, [body]);

  function reload() {
    const iframe = iframeRef.current;
    iframe.contentWindow.location.reload(true);
  }

  return (
    <iframe
      ref={iframeRef}
      src={VIVLIOSTYLE_VIEWER_HTML_URL}
      width="1000"
    ></iframe>
  );
};
