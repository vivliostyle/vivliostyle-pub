import {GithubRequestSessionApiResponse} from 'pages/api/github/selectFile';
import {User} from 'firebase/auth';
import useSWR from 'swr';
import {GithubReposApiResponse} from '../pages/api/github/repos';
import {ContentOfRepositoryApiResponse} from '../pages/api/github/contentOfRepository';
import firebase, {db} from '@services/firebase';
import {collection, doc, DocumentReference, getDoc} from 'firebase/firestore';
import path from 'path';
import mime from 'mime-types';
import {BranchesApiResponse} from 'pages/api/github/branches';
import { CommitsOfRepositoryApiResponse } from 'pages/api/github/tree';

const VPUBFS_CACHE_NAME = 'vpubfs';
const VPUBFS_ROOT = '/vpubfs';

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
  none = 'none' ,
  init = 'init' ,
  clean = 'clean' , 
  modified = 'modified' ,
  saved = 'saved'
};

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
 * Gitのファイル情報
 */
 export type FileEntry = {
  mode: string; // パーミッション
  path: string; // リポジトリのルートディレクトリからの相対パス
  sha: string;  // コンテンツのハッシュ値
  type: string; // 'blob':ファイル | 'tree':ディレクトリ
  url: string;  // コンテンツにアクセスするためのURL(ファイル情報含む)
  size: number; // ファイルサイズ
};

/**
 * エディタで編集しているファイル情報
 */
export type CurrentFile = {
  file: FileEntry | null;
  text: string;
  ext: string; // 拡張子
  state: FileState;
  // session?: DocumentReference;
  modify: (text: string) => void;
  commit: ()=>void;
};

/**
 *
 * @param param0
 * @returns
 */
export async function readFileContent({
  user,
  owner,
  repo,
  branch
}: RepositoryPath,file:FileEntry): Promise<string| null> {
  console.log('readFileContent',file);
  if (!(user && owner && repo && branch && file && file.path)) {
    console.log('readFileContent context error',user, owner, repo, branch, file);
    return null;
  }
  // WebAPIにアクセスしてsessionIDを取得
  const {id}: GithubRequestSessionApiResponse = await fetch(
    '/api/github/selectFile',
    {
      method: 'POST',
      body: JSON.stringify({owner, repo, branch, path:file.path}),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) => {
    console.log('readFileContent status',r.status);
    if (r.status === 200) {
      return r.json();
    } else if (r.status === 400) {
      throw new Error('invalid request');
    } else if (r.status === 401) {
      throw new Error('id token error');
    } else if (r.status === 405) {
      throw new Error('github access error');
    }
  }).catch((err)=>{
    console.log('readFileContent error',err.message);
  });

  const sessionRef = doc(db, 'users', user.uid, 'sessions', id);
  const session = await getDoc(sessionRef);
  const data = session.data();
  console.log('readFileContent result',data);
  if (!data) {
    return null;
  }
  // return { 
  //   text: 'test',
  //   file: null,
  //   ext: getExt(file.path),
  //   state: FileState.init,
  //   modify: ()=>{},
  //   commit: ()=>{}
  //   //session: session,
  // };
  return data.text;
}

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
): Promise<ContentOfRepositoryApiResponse> {
  const content: ContentOfRepositoryApiResponse = await fetch(
    `/api/github/contentOfRepository?${new URLSearchParams({
      owner,
      repo,
      branch,
      path,
    })}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) => {
    if (r.status === 403) {
      throw new Error(`403:${path}`);
    }
    return r.json();
  });
  if (Array.isArray(content) || !('content' in content)) {
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
 * @param cachePath
 * @param content
 */
export async function updateCache(cachePath: string, content: any) {
  const filePath = path.join(VPUBFS_ROOT, cachePath);
  const cache = await caches.open(VPUBFS_CACHE_NAME);
  const contentType = mime.lookup(filePath);
  console.log(`updateCache : ${filePath}`);
  const headers = new Headers();
  headers.append('content-type', `${contentType.toString()}`);
  await cache.delete(filePath);
  await cache.put(filePath, new Response(content, {headers}));
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
  if ('content' in content) {
    await updateCache(contentPath, Buffer.from(content.content, 'base64'));
  }
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

/**
 * ブランチに存在する全てのファイル名を取得
 */
export const fetchFiles = async (
    user: User,
    owner: string,
    repo: string,
    branch: string,
    tree_sha: string,
  ): Promise<FileEntry[]> => {
    console.log('fetchFiles', owner, repo, branch);
    if (!owner || !repo || !branch) {
      return [];
    }
    try {
      const token = await user.getIdToken();
      const resp = await fetch(
        `/api/github/tree?${new URLSearchParams({
          owner,
          repo,
          branch,
          tree_sha,
        })}`,
        {
          method: 'GET',
          headers: {
            'x-id-token': token,
          },
        },
      );
      const data = (await resp.json()) as CommitsOfRepositoryApiResponse;
      console.log('data', data.tree);
      const files = data.tree.map((tree) => {
        console.log(tree);
        return tree as FileEntry;
      });
      // console.log('files',files);
      return files;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
