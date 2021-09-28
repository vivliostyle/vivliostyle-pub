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

const getFileContentFromGithub = async(owner:string, repo:string, path: string, user: firebase.User) => {
  const content : ContentOfRepositoryApiResponse = await fetch(
    `/api/github/contentOfRepository?${new URLSearchParams({owner, repo, path})}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) => r.json());
  if( Array.isArray(content) || !("content" in content) ) {
    // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
    throw new Error(`Content type is not file`);
  }
  return content
}

async function updateCache(cachePath: string, content: any) {
  const filePath = path.join(VPUBFS_ROOT, cachePath);
  const cache = await caches.open(VPUBFS_CACHE_NAME);
  const contentType = mime.lookup(filePath)
  console.log(`updateCache : ${filePath}`)
  const headers = new Headers();
  headers.append('content-type', `${contentType.toString()}`);
  await cache.delete(filePath)
  await cache.put(
    filePath,
    new Response(content, { headers }),
  );
}

const isURL = (value: string) => (/^http(?:s)?:\/\//g).test(value)

const updateCacheFromPath = async(owner: string, repo: string, basePath: string, contentRelativePath: string, user: firebase.User) => {
  if( isURL(contentRelativePath) ) return;
  const contentPath = path.join(path.dirname(basePath), contentRelativePath)
  const content = await getFileContentFromGithub(owner, repo, contentPath, user)
  await updateCache(contentPath, Buffer.from(content.content, 'base64'))
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
  stylesheet,
  owner,
  repo,
  user,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Why Date.now()? -> disable viewer cache
  const viewerURL = useMemo(() => {
    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${path.join(VPUBFS_ROOT, basename)}`
    if(stylesheet) url += `&style=${isURL(stylesheet) ? stylesheet : path.join(VPUBFS_ROOT, stylesheet)}`
    return url
  },[basename, stylesheet]);

  useEffect(() => {
    if(!user) return
    (async() => {
      if( stylesheet && !isURL(stylesheet) ){
        const content = await getFileContentFromGithub(owner,repo, stylesheet, user)
        const stylesheetString = Buffer.from(content.content, 'base64').toString()
        await updateCache(stylesheet, stylesheetString)
        const imagesOfStyle = Array.from(stylesheetString.matchAll(/url\("?(.+?)"?\)/g), m => m[1])
        await Promise.all(imagesOfStyle.map(imageOfStyle => updateCacheFromPath(owner, repo, stylesheet, imageOfStyle, user)))
      }
      const htmlString = stringify(body);
      await updateCache(basename, htmlString)

      const imagePaths = [] as string[]
      const parser = new DOMParser();
      parser.parseFromString(htmlString, 'text/html').querySelectorAll('img').forEach(element => {
        const src = element.getAttribute("src")
        if( src && !isURL(src) ) imagePaths.push(src)
      })

      await Promise.all(imagePaths.map(imagePath => updateCacheFromPath(owner, repo, basename, imagePath, user)))

      iframeRef.current?.contentWindow?.location.reload()
    })()
  }, [body, basename, stylesheet, owner, repo, user]);

  return <iframe ref={iframeRef} src={viewerURL} width="100%" height="100%"></iframe>;
};
