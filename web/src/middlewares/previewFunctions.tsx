import {stringify} from '@vivliostyle/vfm';
import {
  isURL,
  updateCacheFromPath,
} from './frontendFunctions';
import {AppContext} from './useAppContext';
import {Repository} from './useRepositoryContext';
import path from 'path';
import { Theme } from 'theme-manager';
import { WebApiFs } from './WebApiFS';

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
  // console.log('imagePaths', imagePaths);
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

/**
 * CSS形式のテーマに含まれるリソースを取得してアプリケーションキャッシュに保存する
 * @param app 
 * @param repository 
 * @param theme 
 * @returns 
 */
export const processThemeString = async (
  app: AppContext,
  theme: Theme
):Promise<string> => {
  console.log('processingThemeString',theme);
  if( !theme.style ) { console.log('empty theme'); return ''; }
  const themePath = `${theme.name}/${theme.style}`;
  const stylesheet = await theme.fs.readFile(theme.style) as string;
  // console.log('stylesheet',stylesheet);
  if(!stylesheet) {
    return '';
  }

  await app.vpubFs!.writeFile(themePath, stylesheet);
  console.log(`updateCache : ${themePath}`);
  
  const imagesOfStyle = pickupCSSResources(stylesheet);
  // console.log('imagesOfStyle',imagesOfStyle);
  await Promise.all(
    imagesOfStyle.map(async(imageOfStyle) => {
      const contentPath = path.join(path.dirname(theme.style),imageOfStyle);
      // console.log('contentPath',contentPath);
      const content = await theme.fs.readFile(contentPath);
      app.vpubFs?.writeFile(contentPath, content);
    }),
  ).catch((error) => {
    console.log(error);
    throw error;
  });

  return app.vpubFs?.root+'/'+themePath;
}