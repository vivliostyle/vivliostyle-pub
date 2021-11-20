import {stringify} from '@vivliostyle/vfm';
import { getFileContentFromGithub, isURL, updateCache, updateCacheFromPath } from './frontendFunctions';
import { AppContext } from './useAppContext';
import { Repository } from './useRepositoryContext';
import path from 'path';

export const VPUBFS_ROOT = '/vpubfs';

  /**
   * CSSからアプリケーションキャッシュの対象になるファイルのリストアップ
   * @param text
   * @returns
   */
export const pickupCSSResources = (text: string): string[] => {
    // TODO: パースして取り出す エラー処理も重要
    // const ast = parse(text);

    const imagePaths = Array.from(
      text.matchAll(/url\("?(.+?)"?\)/g),
      (m) => m[1],
    );
    return imagePaths;
  };

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
    app:AppContext,
    repository:Repository,
    srcPath: string,
    text: string
):Promise<{vPubPath:string,text:string}> {
  if (srcPath && text && srcPath.endsWith('.md')) {
    srcPath = srcPath.replace(/\.md$/, '.html');
    text = stringify(text);
  }
  console.log('transpiled', srcPath, '\n' /*, text*/);
  if (srcPath.endsWith('.html')) {
    const imagePaths = pickupHtmlResources(text);
    Promise.all(
      imagePaths.map((imagePath) =>
        updateCacheFromPath(
          repository.owner!,
          repository.repo!,
          repository.currentBranch!,
          srcPath!,
          imagePath,
          app.user!,
        ),
      ),
    ).catch((error) => {
      if (error.message.startsWith('403:')) {
        console.error(error.message);
        // toast({
        //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
        //   status: "error"
        // });
      }
    });
    console.log('imagePaths', imagePaths);
  }
  updateCache(srcPath, text).then(() => {});
  const vPubPath = path.join(VPUBFS_ROOT, srcPath ?? '');
  return {vPubPath,text};
}

  /**
   * テーマの準備
   */
export const processTheme = async(app:AppContext,repository:Repository,path: string):Promise<string> => {
    if (app.user && path && !isURL(path)) {
        const content = await getFileContentFromGithub(
          repository.owner!,
          repository.repo!,
          repository.currentBranch!,
          path,
          app.user!,
        );
        if ('content' in content) {
          const stylesheet = content.content;
          await updateCache(path, stylesheet);
          const imagesOfStyle = pickupCSSResources(stylesheet);
          await Promise.all(
            imagesOfStyle.map((imageOfStyle) =>
              updateCacheFromPath(
                repository.owner!,
                repository.repo!,
                repository.currentBranch!,
                stylesheet,
                imageOfStyle,
                app.user!,
              ),
            ),
          ).catch((error) => {
            if (error.message.startsWith('403:')) {
              console.error(error);
              // toast({
              //   title: "file size too large (Max 1MB) : " + error.message.split(':')[1],
              //   status: "error"
              // });
            }
          });
        }
    }
    return path;
};
