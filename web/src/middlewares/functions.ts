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

export async function createFile({
  user,
  owner,
  repo,
  branch,
  path,
}: RepositoryPath): Promise<CurrentFile | null> {
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
  };
}

export function updateFile() {}

export function deleteFile() {}
