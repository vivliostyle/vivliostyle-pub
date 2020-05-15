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
<link rel="stylesheet" type="text/css" href="{{stylesheet}}" />
</head>
<body role="doc-chapter">
{{body}}
</body>
</html>`;

function buildViewerURL(
  filename: string,
  {style}: {style?: string} = {},
): string {
  let url =
    VIVLIOSTYLE_VIEWER_HTML_URL + `#x=${path.join(VPUBFS_ROOT, filename)}`;
  if (style) {
    url += `&style=${style}`;
  }
  return url;
}

function stringifyMarkdown(
  markdownString: string,
  {stylesheet = ''}: {stylesheet?: string} = {},
): string {
  const processor = unified().use(markdown).use(remark2rehype).use(html);
  const generated = String(processor.processSync(markdownString));
  const htmlString = DEFAULT_TEMPLATE_HTML.replace(
    '{{body}}',
    generated,
  ).replace('{{stylesheet}}', stylesheet);
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

interface ViewerProps {
  body: string;
  basename?: string;
  stylesheet?: string;
}

export const Viewer: React.FC<ViewerProps> = ({
  body,
  basename = 'index.html',
  stylesheet = 'https://vivliostyle.github.io/vivliostyle_doc/samples/gon/style.css',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>();
  const viewerURL = useMemo(() => buildViewerURL(basename), []);

  useEffect(() => {
    const htmlString = stringifyMarkdown(body, {stylesheet});

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
