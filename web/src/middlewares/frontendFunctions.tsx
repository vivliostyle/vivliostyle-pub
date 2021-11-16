import {GithubRequestSessionApiResponse} from 'pages/api/github/selectFile';
import {CurrentFile} from 'pages/github/[owner]/[repo]';
import { User } from "firebase/auth";
import useSWR from 'swr';
import {GithubReposApiResponse} from '../pages/api/github/repos';
import {ContentOfRepositoryApiResponse} from '../pages/api/github/contentOfRepository'
import firebase, { db } from '@services/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';


type RepositoryPath = {
  user: User | null;
  owner: string | undefined;
  repo: string | undefined;
  branch: string | undefined;
  path: string;
};

/**
 * 
 * @param param0 
 * @returns 
 */
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

  
  const sessionRef = doc(db,'users',user.uid,'sessions',id);
  const session = await getDoc(sessionRef);

  // const session = await firebase
  //   .firestore()
  //   .collection('users')
  //   .doc(user.uid)
  //   .collection('sessions')
  //   .doc(id);

  const data = session.data();
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


export async function getFileContentFromGithub(owner:string, repo:string, branch:string ,path: string, user: User):Promise<ContentOfRepositoryApiResponse> {
  const content : ContentOfRepositoryApiResponse = await fetch(
    `/api/github/contentOfRepository?${new URLSearchParams({owner, repo, branch, path})}`,
    {
      headers: {
        'content-type': 'application/json',
        'x-id-token': await user.getIdToken(),
      },
    },
  ).then((r) =>{ 
    if(r.status === 403) {
      throw new Error(`403:${path}`);
    }
    return r.json();
  });
  if( Array.isArray(content) || !("content" in content) ) {
    // https://docs.github.com/en/rest/reference/repos#get-repository-content--code-samples
    throw new Error(`Content type is not file`);
  }
  return content
}

const fetcher = (url: string, idToken: string) =>
  fetch(url, {
    headers: {
      'x-id-token': idToken,
    },
  }).then((r) => r.json());
  
export function GetRepsitoryList(idToken:string|null){
  return useSWR<GithubReposApiResponse>(
    idToken ? ['/api/github/repos', idToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );
}