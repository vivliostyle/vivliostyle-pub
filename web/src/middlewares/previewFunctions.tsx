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
import { AppCacheFs } from './AppCacheFS';

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
  repository: Repository,
  theme: Theme
):Promise<string> => {
  const themePath = `${theme.name}/${theme.style}`;
  const stylesheet = theme.files[theme.style];

  await app.vpubFs!.writeFile(themePath, stylesheet);
  console.log(`updateCache : ${themePath}`);
  
  const imagesOfStyle = pickupCSSResources(stylesheet);
  await Promise.all(
    imagesOfStyle.map((imageOfStyle) =>
      updateCacheFromPath(
        repository.owner!,
        repository.repo!,
        repository.branch!,
        stylesheet,
        imageOfStyle,
        app.user!,
      ),
    ),
  ).catch((error) => {
    console.log(error);
    throw error;
  });

  return themePath;
}

/**
 * テーマの準備
 */
export const processTheme = async (
  app: AppContext,
  repository: Repository,
  themePath: string,
): Promise<string> => {
  console.log('processTheme', app,path);
  if (! (app.user && path && !isURL(themePath)) ) { throw new Error('app.user or themePath not set'); }

  // リポジトリからstylesheetを取得してApplicationCacheに追加
  const webApifs = await WebApiFs.open({
    user:app.user!,
    owner:repository.owner!,
    repo:repository.repo!,
    branch:repository.branch!,
  });
  const stylesheet = await webApifs.readFile(themePath);
  await app.vpubFs!.writeFile(themePath,stylesheet);

  // stylesheetが参照している画像を取得してApplicationCacheに追加
  const imagesOfStyle = pickupCSSResources(stylesheet.toString());
  const basePath = path.dirname(themePath); // スタイルシートのパスを基準とする
  await Promise.all(
      imagesOfStyle.map(async (imageOfStyle) =>{
        if (isURL(imageOfStyle)) return;
        const contentPath = path.join(basePath, imageOfStyle);
        const content = await webApifs.readFile(contentPath);
        await app.vpubFs!.writeFile(imageOfStyle, content);
      })
    ).catch((error) => {
      throw error;
    });
  return themePath;
};
