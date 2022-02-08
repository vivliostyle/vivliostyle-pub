import {User} from 'firebase/auth';
import upath from 'upath';
import {AppCacheFs} from './fs/AppCacheFS';
import {WebApiFs} from './fs/WebApiFS';

/**
 * consoleにコンポーネント名を付けて表示するためのラッパー
 * ユーザに通知するならLogContextを使用する
 * 使用例
 * const {_log, _err} = devConsole('[useAppContext]');
 * _log('init');
 * @param header コンポーネント名
 * @param isEnable 表示フラグ
 * @returns
 */
export function devConsole(header: string, isEnable: boolean = true) {
  return {
    _log: isEnable ? console.log.bind(console, header) : () => {},
    _err: isEnable ? console.error.bind(console, header) : () => {},
  };
}

/**
 * URL判別
 * @param value
 * @returns
 */
export const isURL = (value: string) => /^http(?:s)?:\/\//g.test(value);

/**
 * エディタで編集可能なファイルか
 * @param path
 * @returns
 */
export function isEditableFile(path?: string) {
  const ext = getExt(path);
  return ext == 'md' || ext == 'html' || ext == 'css' || ext == 'js';
}

/**
 * 画像ファイルか
 * @param path
 * @returns
 */
export function isImageFile(path: string) {
  const ext = getExt(path);
  return (
    ext == 'png' ||
    ext == 'jpeg' ||
    ext == 'jpg' ||
    ext == 'gif' ||
    ext == 'svg'
  );
}

/**
 * パスから拡張子を取り出す
 * @param path
 * @returns
 */
export function getExt(path?: string) {
  const ext = path ? path.split('.').splice(-1)[0].toLowerCase() : '';
  return ext;
}

/**
 * エディタでのファイル状態
 * none ファイルが選択されてない
 * busy ファイルが選択されて編集可能になるまでや、保存中
 * init 初めて開いた状態
 * clean リポジトリと一致している状態
 * modified 内容が変更された状態
 * saved firestoreと一致している状態
 */
export enum FileState {
  none = 'none',
  busy = 'busy',
  init = 'init',
  clean = 'clean',
  modified = 'modified',
  saved = 'saved',
}

/**
 * GitHubからファイルを取得
 * @param owner
 * @param repo
 * @param branch
 * @param path
 * @param user
 * @returns
 */
export async function getFileContentFromGithub(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  user: User,
): Promise<any> {
  const props = {user, owner, repo, branch};
  // console.log('getFileContent props',props, path);
  const fs: WebApiFs = await WebApiFs.open(props);
  const content = await fs.readFile(path);
  if (Array.isArray(content)) {
    // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
    throw new Error(`Content type is not file`);
  }
  return content;
}

/**
 * GitHubからコンテンツを取得してApplication Cacheに保存する
 * @param owner    リポジトリオーナー名
 * @param repo     リポジトリ名
 * @param branch   ブランチ名
 * @param basePath mdやhtmlのパス
 * @param contentRelativePath mdやhtmlからの相対パス
 * @param user     ログインユーザ
 * @returns
 */
export const updateCacheFromPath = async (
  owner: string,
  repo: string,
  branch: string,
  basePath: string,
  contentRelativePath: string,
  user: User,
) => {
  if (isURL(contentRelativePath)) return;
  const contentPath = upath.join(upath.dirname(basePath), contentRelativePath);
  // console.log("updateCacheFromPath", basePath, contentRelativePath, contentPath);
  const content = await getFileContentFromGithub(
    owner,
    repo,
    branch,
    contentPath,
    user,
  );
  const fs = await AppCacheFs.open();
  // console.log("getFileContentFromPath",content);
  await fs.writeFile(contentPath, content);
  console.log(`updateCache : ${contentPath}`);
};
