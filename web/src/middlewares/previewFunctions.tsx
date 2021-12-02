import {stringify} from '@vivliostyle/vfm';
import {
  isURL,
  updateCacheFromPath,
} from './frontendFunctions';
import {AppContext} from './contexts/useAppContext';
import {Repository} from './contexts/useRepositoryContext';
import path from 'path';

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
  srcPath: string,
  text: string,
): Promise<{vPubPath: string; text: string}> {
  if (srcPath && text && srcPath.endsWith('.md')) {
    srcPath = srcPath.replace(/\.md$/, '.html');
    text = stringify(text);
  }
  console.log('transpiled', srcPath, '\n' /*, text*/);
  if (srcPath.endsWith('.html')) {
    const imagePaths = pickupHtmlResources(text);
    const promises = imagePaths.map(async (imagePath) => {
        console.log('imagePath in HTML',imagePath);
        await updateCacheFromPath(
          repository.owner!,
          repository.repo!,
          repository.branch!,
          srcPath!,
          imagePath,
          app.user!,
        )
    });
    try {
      await Promise.all(promises);
    }catch(err:any) {
      if (err.message.startsWith('403:')) {
        console.error(err.message);
        // TODO: ログ表示
        // toast({
        //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
        //   status: "error"
        // });
      }
    }
    console.log('imagePaths', imagePaths);
  }
  await app.vpubFs!.writeFile(srcPath, text);
  console.log(`updateCache : ${srcPath}`);
  const vPubPath = path.join(VPUBFS_ROOT, srcPath ?? '');
  return {vPubPath, text};
}