import {stringify} from '@vivliostyle/vfm';
import {
  isURL,
  updateCacheFromPath,
} from './frontendFunctions';
import {AppContext} from './contexts/useAppContext';
import {Repository} from './contexts/useRepositoryContext';
import upath from 'upath';
import { VFile } from 'theme-manager';

export const VPUBFS_ROOT = '/vpubfs';


/**
 * HTMLからアプリケーションキャッシュの対象になるファイルのリストアップ
 * @param text
 * @returns
 */
const pickupHtmlResources = (text: string): string[] => {
  const imagePaths = [] as string[];
  const parser = new DOMParser();
  // アプリケーションキャッシュの対象になる画像ファイルの取得
  parser
    .parseFromString(text, 'text/html')
    .querySelectorAll('img')
    .forEach((element) => {
      const src = element.getAttribute('src');
      if (src && !isURL(src)) imagePaths.push(src);
    });
  // TODO: link要素によるCSSファイルも扱う

  return imagePaths;
};

/**
 *
 */
export async function transpileMarkdown(
  app: AppContext,
  repository: Repository,
  file:VFile
): Promise<{vPubPath: string; text: string; errors:Error[]}> {
  
  let srcPath = file.path;
  if(!file.hasContent) {
    await file.getContent();
  }
  let text = file.content;
  // console.log('transpileMarkdown',srcPath,text);
  if (srcPath && text && srcPath.endsWith('.md')) {
    srcPath = srcPath.replace(/\.md$/, '.html');
    text = stringify(text);
  }
  console.log('transpiled', srcPath, '\n' /*, text*/);
  let errors:Error[] = [];
  if (srcPath.endsWith('.html')) {
    const imagePaths = pickupHtmlResources(text);
    console.log('transpile imagePaths',imagePaths);
    const promises = imagePaths.map(async (imagePath) => {
      try{
        console.log('imagePath in HTML',imagePath);
        await updateCacheFromPath(
          repository.owner!,
          repository.repo!,
          repository.branch!,
          srcPath!,
          imagePath,
          app.user!,
        )
        return null; // エラーが無ければfilterで除去するためにnullを返す
      }catch(error:any){
        return new Error(`${imagePath}(${error.message})`);
      }
    });
//    try {
      const results = await Promise.all(promises);
      errors = results.filter(r=>r) as Error[];
    // }catch(err:any) {
    //   if (err.message.startsWith('403:')) {
    //     console.error(err.message);
    //     // TODO: ログ表示
    //     // toast({
    //     //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
    //     //   status: "error"
    //     // });
    //   }
    // }
    // console.log('imagePaths', imagePaths);
  }
  await app.vpubFs!.writeFile(srcPath, text);
  console.log(`updateCache : ${srcPath}`);
  const vPubPath = upath.join(VPUBFS_ROOT, srcPath ?? '');
  return {vPubPath, text, errors};
}