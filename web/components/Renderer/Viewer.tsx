import {useRef, useEffect, useMemo} from 'react';
import unified from 'unified';
import markdown from 'remark-parse';
import remark2rehype from 'remark-rehype';
import html from 'rehype-stringify';
import path from 'path';

const VPUBFS_CACHE_NAME = 'vpubfs';
const VPUBFS_ROOT = '/vpubfs';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';
const DEFAULT_TEMPLATE_HTML = `
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=s, initial-scale=1.0">
</head>
<body role="doc-chapter">
{{body}}
</body>
</html>`;

function buildViewerURL(
  filename: string = 'index.html',
  {style}: {style?: string} = {},
): string {
  let url =
    VIVLIOSTYLE_VIEWER_HTML_URL + `#x=${path.join(VPUBFS_ROOT, filename)}`;
  if (style) {
    url += `&style=${style}`;
  }
  return url;
}

function stringifyMarkdown(markdownString: string): string {
  const processor = unified().use(markdown).use(remark2rehype).use(html);
  const generated = String(processor.processSync(markdownString));
  const htmlString = DEFAULT_TEMPLATE_HTML.replace('{{body}}', generated);
  return htmlString;
}

function updateCache(cachePath: string, content: any) {
  const filePath = path.join(VPUBFS_ROOT, cachePath);
  return caches.open(VPUBFS_CACHE_NAME).then((cache) =>
    cache.put(
      filePath,
      new Response(content, {
        headers: {'content-type': 'text/html'},
      }),
    ),
  );
}

export const Viewer: React.FC<{body: string}> = ({body}) => {
  const iframeRef = useRef<HTMLIFrameElement>();
  const viewerURL = useMemo(() => buildViewerURL(), []);

  useEffect(() => {
    const htmlString = stringifyMarkdown(body);

    updateCache('index.html', htmlString).then(() => {
      reload();
    });
  }, [body]);

  function reload() {
    const iframe = iframeRef.current;
    iframe.contentWindow.location.reload(true);
  }

  return <iframe ref={iframeRef} src={viewerURL} width="1000"></iframe>;
};
