import {User} from 'firebase/auth';
import useSWR from 'swr';
import {GithubReposApiResponse} from '../pages/api/github/repos';
import firebase, {db} from '@services/firebase';
import {collection, doc, DocumentReference, getDoc} from 'firebase/firestore';
import path from 'path';
import {BranchesApiResponse} from 'pages/api/github/branches';
import {AppCacheFs} from './AppCacheFS';
import {WebApiFs} from './WebApiFS';
import { Dirent } from 'fs-extra';

const VPUBFS_CACHE_NAME = 'vpubfs';

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
 * init 初めて開いた状態
 * clean リポジトリと一致している状態
 * modified 内容が変更された状態
 * saved firestoreと一致している状態
 */
export enum FileState {
  none = 'none',
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

/**
 * エディタで編集しているファイル情報
 */
export type CurrentFile = {
  file: Dirent | null;
  text: string;
  ext: string; // 拡張子
  state: FileState;
  // session?: DocumentReference;
  modify: (text: string) => void;
  commit: () => void;
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
  const fs: WebApiFs = await WebApiFs.open({user, owner, repo, branch});
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
 *
 * @param idToken
 * @returns
 */
export function GetRepsitoryList(idToken: string | null) {
  return useSWR<GithubReposApiResponse>(
    idToken ? ['/api/github/repos', idToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );
}

/**
 *
 * @param owner
 * @param repo
 * @param branch
 * @param basePath
 * @param contentRelativePath
 * @param user
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
  const contentPath = path.join(path.dirname(basePath), contentRelativePath);
  const content = await getFileContentFromGithub(
    owner,
    repo,
    branch,
    contentPath,
    user,
  );
  const fs = await AppCacheFs.open();
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

