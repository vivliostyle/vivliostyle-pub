import {useRef, useEffect, useMemo} from 'react';
import {stringify} from '@vivliostyle/vfm';
import path from 'path';
import mime from 'mime-types'

import {ContentOfRepositoryApiResponse} from '../pages/api/github/contentOfRepository'
import firebase from '@services/firebase';

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
    `?${(new Date()).getTime()}` + // disable viewer cache
    `#x=${path.join(VPUBFS_ROOT, filename)}&bookMode=true`;
  if (style) {
    url += `&style=${style}`;
  }
  return url;
}

const getContent = async(owner:string, repo:string, path: string, user: firebase.User) => {
  const idToken = await user.getIdToken();
  const params = {owner, repo, path: 'vivliostyle.config.js'}
  const query_params = new URLSearchParams(params); 
  const content : ContentOfRepositoryApiResponse = await fetch(
    `/api/github/contentOfRepository?${query_params}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-id-token': idToken,
      },
    },
  ).then((r) => r.json());
  return content
}

async function updateCache(cachePath: string, content: any) {
  const filePath = path.join(VPUBFS_ROOT, cachePath);
  const cache = await caches.open(VPUBFS_CACHE_NAME);
  const contentType = mime.lookup(filePath)
  return await cache.put(
    filePath,
    new Response(content, contentType ? {
      headers: {'content-type': contentType},
    } : undefined),
  );
}

interface PreviewerProps {
  body: string;
  basename: string;
  stylesheet?: string;
  owner: string;
  repo: string;
  user: firebase.User | null;
}

export const Previewer: React.FC<PreviewerProps> = ({
  body,
  basename,
  stylesheet = '',
  owner,
  repo,
  user,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewerURL = useMemo(() => buildViewerURL(basename), [basename]);

  useEffect(() => {
    if(!user) return
    (async() => {
      const htmlString = stringify(body, {style: stylesheet});

      const imagePaths = [] as string[]
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html')
      const imageElements = doc.querySelectorAll('img')
      imageElements.forEach(element => {
        const src = element.getAttribute("src")
        if( src && !( src.includes("https://") || src.includes("http://") ) ) imagePaths.push(src)
      })
      
      for(let i=0; i < imagePaths.length; i++) {
        const contentPath = path.join(path.dirname(basename), imagePaths[i])
        const content = await getContent(owner,repo, contentPath, user)
        await updateCache(contentPath, Buffer.from(content.content, 'base64'))
      }

      await updateCache(basename, htmlString)
      iframeRef.current?.contentWindow?.location.reload()
    })()
  }, [body, basename, stylesheet, owner, repo, user]);

  return <iframe ref={iframeRef} src={viewerURL} width="100%" height="100%"></iframe>;
};
