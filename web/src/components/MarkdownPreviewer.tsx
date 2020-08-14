import {useRef, useEffect, useMemo} from 'react';
import {stringify} from '@vivliostyle/vfm';
import path from 'path';

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
    const htmlString = stringify(body, {style: stylesheet});

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
