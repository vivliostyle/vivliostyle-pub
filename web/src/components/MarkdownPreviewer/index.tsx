import {useRef, useEffect, useMemo} from 'react';
import path from 'path';
import unified from 'unified';
import markdown from 'remark-parse';
import remark2rehype from 'remark-rehype';
import raw from 'rehype-raw';
import doc from 'rehype-document';
import stringify from 'rehype-stringify';

import {rubyParser, rubyHandler} from './ruby';

interface PreviewerProps {
  body: string;
  basename?: string;
  stylesheet?: string;
}

const VPUBFS_CACHE_NAME = 'vpubfs';
const VPUBFS_ROOT = '/vpubfs';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

function buildViewerURL(
  filename: string,
  {style}: {style?: string} = {},
): string {
  let url =
    VIVLIOSTYLE_VIEWER_HTML_URL +
    `#x=${path.join(VPUBFS_ROOT, filename)}&bookMode=true`;
  if (style) {
    url += `&style=${style}`;
  }
  return url;
}

function stringifyMarkdown(
  markdownString: string,
  {stylesheet = ''}: {stylesheet?: string} = {},
): string {
  const processor = unified()
    .use(markdown, {commonmark: true})
    .use(rubyParser)
    .use(remark2rehype, {
      allowDangerousHtml: true,
      handlers: {ruby: rubyHandler},
    })
    .use(raw)
    .use(doc, {language: 'ja', css: stylesheet})
    .use(stringify);
  const generated = String(processor.processSync(markdownString));
  return generated;
}

async function updateCache(cachePath: string, content: any) {
  const filePath = path.join(VPUBFS_ROOT, cachePath);
  const cache = await caches.open(VPUBFS_CACHE_NAME);
  return await cache.put(
    filePath,
    new Response(content, {
      headers: {'content-type': 'text/html'},
    }),
  );
}

export const Previewer: React.FC<PreviewerProps> = ({
  body,
  basename = 'index.html',
  stylesheet = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewerURL = useMemo(() => buildViewerURL(basename), []);

  useEffect(() => {
    const htmlString = stringifyMarkdown(body, {stylesheet});

    updateCache('index.html', htmlString).then(() => {
      reload();
    });
  }, [body, basename, stylesheet]);

  function reload() {
    const iframe = iframeRef.current;
    iframe?.contentWindow?.location.reload(true);
  }

  return <iframe ref={iframeRef} src={viewerURL} width="1000"></iframe>;
};
