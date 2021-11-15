import firebase from 'firebase';
import {GithubRequestSessionApiResponse} from 'pages/api/github/selectFile';
import {CurrentFile} from 'pages/github/[owner]/[repo]';

type RepositoryPath = {
  user: firebase.User | null;
  owner: string | undefined;
  repo: string | undefined;
  branch: string | undefined;
  path: string;
};

const getBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file)
  })
}

export async function createFile({
  user,
  owner,
  repo,
  branch,
  path,
}: RepositoryPath,data:File): Promise<CurrentFile | null> {
  if (!(user && owner && repo && branch && path)) {
    return null;
  }
  try {
    const result = await fetch('/api/github/createOrUpdateFileContents', {
      method: 'POST',
      body: JSON.stringify({
        owner,
        repo,
        branch,
        path: path,
        content: (await getBase64(data))?.toString().split(',')[1] // remove dataURL's prefixr
      }),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    });
    console.log(result.status);
  } catch (error) {
    console.error(error);
  }

  

  return null;
}

export async function readFile({
  user,
  owner,
  repo,
  branch,
  path,
}: RepositoryPath): Promise<CurrentFile | null> {
  if (!(user && owner && repo && branch && path)) {
    return null;
  }
  // WebAPIにアクセスしてsessionIDを取得
  const {id}: GithubRequestSessionApiResponse = await fetch(
    '/api/github/selectFile',
    {
      method: 'POST',
      body: JSON.stringify({owner, repo, branch, path}),
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) => {
    if(r.status === 200){
      return r.json();
    }else if(r.status === 400) {
      throw new Error('invalid request');
    }else if(r.status === 401) {
      throw new Error('id token error');
    }else if(r.status === 405) {
      throw new Error('github access error');
    }
  });

  const session = await firebase
    .firestore()
    .collection('users')
    .doc(user.uid)
    .collection('sessions')
    .doc(id);

  const data = (await session.get()).data();
  if (!data) {
    return null;
  }
  return {
    state: 'init',
    text: data.text,
    path: path,
    session: session
  };
}

export async function updateFile() {

}

export async function commitFile() {

}

export async function deleteFile() {

}

import {ContentOfRepositoryApiResponse} from '../pages/api/github/contentOfRepository'

export async function getFileContentFromGithub(owner:string, repo:string, path: string, user: firebase.User):Promise<ContentOfRepositoryApiResponse> {
  const content : ContentOfRepositoryApiResponse = await fetch(
    `/api/github/contentOfRepository?${new URLSearchParams({owner, repo, path})}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) => r.json());
  if( Array.isArray(content) || !("content" in content) ) {
    // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
    throw new Error(`Content type is not file`);
  }
  return content
}