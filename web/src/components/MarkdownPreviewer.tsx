import {useRef, useEffect, useMemo, useState} from 'react';
import {stringify} from '@vivliostyle/vfm';
import path from 'path';
import mime from 'mime-types'

import firebase from '@services/firebase';
import { useToast } from '@chakra-ui/toast';
import { useModifiedTextContext } from '@middlewares/useModifiedTextContext';
import { useRepositoryContext } from '@middlewares/useRepositoryContext';
import { getFileContentFromGithub } from '@middlewares/functions';
import { TYPE_PREVIEW_TARGET } from 'pages/github/[owner]/[repo]';

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

const updateCacheFromPath = async(owner: string, repo: string, branch:string, basePath: string, contentRelativePath: string, user: firebase.User) => {
  if( isURL(contentRelativePath) ) return;
  const contentPath = path.join(path.dirname(basePath), contentRelativePath)
  const content = await getFileContentFromGithub(owner, repo, branch, contentPath, user)
  if("content" in content){
    await updateCache(contentPath, Buffer.from(content.content, 'base64'))
  }
}

interface PreviewerProps {
  target: TYPE_PREVIEW_TARGET;
  stylesheet?: string;
  user: firebase.User | null;
}

export const Previewer: React.FC<PreviewerProps> = ({
  target,
  stylesheet,
  user,
}) => {
  console.log(target);
  const toast = useToast();
  // const modifiedText = useModifiedTextContext();
  const repository = useRepositoryContext();
  const [contentReady,setContentReady] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Why Date.now()? -> disable viewer cache
  const viewerURL = useMemo(() => {
    setContentReady(false);
    let url = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${path.join(VPUBFS_ROOT, target.path??'')}`
    if(stylesheet) url += `&style=${isURL(stylesheet) ? stylesheet : path.join(VPUBFS_ROOT, stylesheet)}`
    return url
  },[target.path, stylesheet]);

  useEffect(() => {
    console.log('rerendering',target.path, target.text,repository,user);
    if(!user || target.text == null || target.path == null ) return
    (async() => {
      if( stylesheet && !isURL(stylesheet) ){
        const content = await getFileContentFromGithub(repository.owner!,repository.repo!, repository.branch!, stylesheet, user)
        if("content" in content) {
          const stylesheetString = Buffer.from(content.content, 'base64').toString()
          await updateCache(stylesheet, stylesheetString)
          const imagesOfStyle = Array.from(stylesheetString.matchAll(/url\("?(.+?)"?\)/g), m => m[1])
          await Promise.all(imagesOfStyle.map(imageOfStyle => updateCacheFromPath(repository.owner!, repository.repo!,repository.branch!, stylesheet, imageOfStyle, user)))
          .catch((error)=>{
            if(error.message.startsWith('403:')){
              console.error(error);
              toast({
                title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
                status: "error"
              });
            }
          });
        }
      }
      const htmlString = stringify(target.text!);
      await updateCache(target.path!, htmlString)

      const imagePaths = [] as string[]
      const parser = new DOMParser();
      parser.parseFromString(htmlString, 'text/html').querySelectorAll('img').forEach(element => {
        const src = element.getAttribute("src")
        if( src && !isURL(src) ) imagePaths.push(src)
      })

      await Promise.all(imagePaths.map(imagePath => updateCacheFromPath(repository.owner!, repository.repo!, repository.branch!, target.path!, imagePath, user)))
      .catch((error)=>{
        if(error.message.startsWith('403:')){
          console.error(error.message);
          toast({
            title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
            status: "error"
          });
        }

      });
      console.log('iframe reload');
      setContentReady(true);
    })()
  }, [target, stylesheet, repository, user]);

  return <iframe ref={iframeRef} src={contentReady?viewerURL:VIVLIOSTYLE_VIEWER_HTML_URL+'#x=empty.html'} width="100%" height="100%"></iframe>;
};
