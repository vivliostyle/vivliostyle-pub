import {stringify} from '@vivliostyle/vfm';
import {isURL, updateCacheFromPath} from './frontendFunctions';
import {AppContext} from './contexts/useAppContext';
import {RepositoryContext} from './contexts/useRepositoryContext';
import upath from 'upath';
import {CurrentFile} from './contexts/useCurrentFileContext';

export const VPUBFS_ROOT = '/vpubfs';

const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL || '/viewer/index.html';

/**
 * HTMLからアプリケーションキャッシュの対象になるファイルのリストアップ
 * @param text
 * @returns
 */
const pickupHtmlResources = (
  text: string,
  documentPath: string,
): {resourcePaths: string[]; html: string} => {
  const resourcePaths = [] as string[];
  const parser = new DOMParser();
  // アプリケーションキャッシュの対象になる画像ファイルの取得
  const parsedDocument = parser.parseFromString(text, 'text/html');

  parsedDocument.querySelectorAll('img').forEach((element) => {
    const src = element.getAttribute('src');
    if (src && !isURL(src)) resourcePaths.push(src);
  });
  // TODO: link要素によるCSSファイルも扱う

  // 同じプロジェクト内へのリンクを書き換える
  parsedDocument.querySelectorAll('a').forEach((element) => {
    const href = element.getAttribute('href');
    // console.log('replace local link',href,href?.match(/^https?:/));
    if (href != null) {
      if (isURL(href)) {
        // httpから始まる場合は別サイトへのリンクとして別ウィンドウ(タブ)でリンク先を表示する
        element.setAttribute('target', '_blank');
      } else {
        const newElm = document.createElement('a');
        const absPath = href.replace(/\.md/i, '.html');
        resourcePaths.push(absPath); // パスをキャッシュストレージに保存するリストに追加する
        let path = upath.join(
          VPUBFS_ROOT,
          upath.resolve(upath.dirname(documentPath), absPath),
        );
        // if(path.startsWith('/')) { path = path.substring(1)}
        newElm.href = `${VIVLIOSTYLE_VIEWER_HTML_URL}?${Date.now()}#x=${path}`;
        newElm.innerHTML = element.innerHTML;
        // newElm.target = '_parent';
        // console.log('replaced local link',element);
        element.replaceWith(newElm);
      }
    }
  });
  console.log('imagePaths', resourcePaths);
  return {
    resourcePaths: resourcePaths,
    html: parsedDocument.documentElement.innerHTML,
  };
};

/**
 *
 */
export async function transpileMarkdown(
  app: AppContext,
  repository: RepositoryContext,
  currentFile: CurrentFile,
): Promise<{vPubPath: string; text: string; errors: Error[]}> {
  if (!currentFile.state.file) {
    return {vPubPath: '', text: '', errors: [new Error('empty file')]};
  }
  let srcPath = currentFile.state.file!.path;
  if (!currentFile.state.text) {
    await currentFile.state.file.getContent();
    currentFile.state.text = currentFile.state.file.content;
  }
  let text = currentFile.state.text;
  // console.log('transpileMarkdown',srcPath,text);
  if (srcPath && text && srcPath.endsWith('.md')) {
    srcPath = srcPath.replace(/\.md$/, '.html');
    text = stringify(text);
  }
  console.log('transpiled', srcPath, '\n' /*, text*/);
  let errors: Error[] = [];
  if (srcPath.endsWith('.html')) {
    const {resourcePaths: resourcePaths, html} = pickupHtmlResources(
      text,
      currentFile.state.file.path,
    );
    text = html;
    console.log('transpile imagePaths', resourcePaths);
    const promises = resourcePaths.map(async (resourcePath) => {
      try {
        console.log('imagePath in HTML', resourcePath);
        await updateCacheFromPath(
          repository.state.owner!,
          repository.state.name!,
          repository.state.branch!,
          srcPath!,
          resourcePath,
          app.state.user!,
        );
        return null; // エラーが無ければfilterで除去するためにnullを返す
      } catch (error: any) {
        return new Error(`${resourcePath}(${error.message})`);
      }
    });
    //    try {
    const results = await Promise.all(promises);
    errors = results.filter((r) => r) as Error[];
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
  await app.state.vpubFs!.writeFile(srcPath, text);
  console.log(`updateCache : ${srcPath}`);
  const vPubPath = upath.join(VPUBFS_ROOT, srcPath ?? '');
  return {vPubPath, text, errors};
}
