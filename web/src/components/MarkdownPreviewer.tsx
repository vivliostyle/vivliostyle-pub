import {useRef, useEffect, useMemo, useState} from 'react';
import {stringify} from '@vivliostyle/vfm';
import path from 'path';
import mime from 'mime-types'

import firebase from '@services/firebase';
import { useModifiedTextContext } from '@middlewares/useModifiedTextContext';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { getFileContentFromGithub } from '@middlewares/functions';

const VPUBFS_CACHE_NAME = 'vpubfs';
const VPUBFS_ROOT = '/vpubfs';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

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
  if("content" in content){
    await updateCache(contentPath, Buffer.from(content.content, 'base64'))
  }
}

interface PreviewerProps {
  basename: string;
  stylesheet?: string;
  user: firebase.User | null;
}

export const Previewer: React.FC<PreviewerProps> = ({
  basename,
  stylesheet,
  user,
}) => {
  const modifiedText = useModifiedTextContext();
  const repository = useRepositoryContext();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Why Date.now()? -> disable viewer cache
  const viewerURL = useMemo(() => {
    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${path.join(VPUBFS_ROOT, basename)}`
    if(stylesheet) url += `&style=${isURL(stylesheet) ? stylesheet : path.join(VPUBFS_ROOT, stylesheet)}`
    return url
  },[basename, stylesheet]);

  useEffect(() => {
    console.log('rerendering');
    if(!user) return
    (async() => {
      if( stylesheet && !isURL(stylesheet) ){
        const content = await getFileContentFromGithub(repository.owner!,repository.repo!, stylesheet, user)
        if("content" in content) {
          const stylesheetString = Buffer.from(content.content, 'base64').toString()
          await updateCache(stylesheet, stylesheetString)
          const imagesOfStyle = Array.from(stylesheetString.matchAll(/url\("?(.+?)"?\)/g), m => m[1])
          await Promise.all(imagesOfStyle.map(imageOfStyle => updateCacheFromPath(repository.owner!, repository.repo!, stylesheet, imageOfStyle, user)))  
        }
      }
      const htmlString = stringify(modifiedText.text!);
      await updateCache(basename, htmlString)

      const imagePaths = [] as string[]
      const parser = new DOMParser();
      parser.parseFromString(htmlString, 'text/html').querySelectorAll('img').forEach(element => {
        const src = element.getAttribute("src")
        if( src && !isURL(src) ) imagePaths.push(src)
      })

      await Promise.all(imagePaths.map(imagePath => updateCacheFromPath(repository.owner!, repository.repo!, basename, imagePath, user)))

      iframeRef.current?.contentWindow?.location.reload()
    })()
  }, [modifiedText,basename, stylesheet, repository, user]);

  return <iframe ref={iframeRef} src={viewerURL} width="100%" height="100%"></iframe>;
};
