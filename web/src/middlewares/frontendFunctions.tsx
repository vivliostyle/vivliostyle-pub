import {User} from 'firebase/auth';
import upath from 'upath';
import {BranchesApiResponse} from 'pages/api/github/branches';
import {AppCacheFs} from './fs/AppCacheFS';
import {WebApiFs} from './fs/WebApiFS';

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
 * リポジトリ上のファイルパス
 */
type RepositoryPath = {
  user: User | null;
  owner: string | undefined;
  repo: string | undefined;
  branch: string | undefined;
  path: string;
};



export async function updateFile() {}

export async function commitFile() {}

export async function deleteFile() {}

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
 *
 * @param url
 * @param idToken
 * @returns
 */
const fetcher = (url: string, idToken: string) =>
  fetch(url, {
    headers: {
      'x-id-token': idToken,
    },
  }).then((r) => r.json());

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
  await fs.writeFile(contentPath, Buffer.from(content, 'base64'));
  console.log(`updateCache : ${contentPath}`);
};

/**
 * リポジトリからブランチのリストを取得
 * @param user
 * @param owner
 * @param repo
 * @returns
 */
export const fetchBranches = async (
  user: User,
  owner: string,
  repo: string,
): Promise<{
  branches: string[];
  defaultBranch: string;
}> => {
  if (!user || !owner || !repo) {
    return {branches: [], defaultBranch: ''};
  }
  try {
    const token = await user.getIdToken();
    const resp = await fetch(
      `/api/github/branches?${new URLSearchParams({owner, repo})}`,
      {
        method: 'GET',
        headers: {
          'x-id-token': token,
        },
      },
    );
    const data = (await resp.json()) as BranchesApiResponse;
    const branches = data.branches.map((b) => b.name);
    const defaultBranch = data.default;
    return {branches, defaultBranch};
  } catch (error) {
    console.error(error);
    throw error;
  }
};

