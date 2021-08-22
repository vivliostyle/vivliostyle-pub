import {useEffect, useState} from 'react';
import fetch from 'isomorphic-unfetch';

import firebase from '@services/firebase';
import {GithubRequestSessionApiResponse} from '../pages/api/github/requestSession';

export function useEditorSession({
  owner,
  repo,
  user,
  path,
}: {
  owner: string;
  repo: string;
  user: firebase.User | null;
  path: string;
}) {
  const [
    session,
    setSession,
  ] = useState<firebase.firestore.DocumentReference | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    (async () => {
      const idToken = await user.getIdToken();
      const {id}: GithubRequestSessionApiResponse = await fetch(
        '/api/github/requestSession',
        {
          method: 'POST',
          body: JSON.stringify({owner, repo, path}),
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        },
      ).then((r) => r.json());
      const session = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('sessions')
        .doc(id);
      setSession(session);
      setSessionId(id);
    })();
  }, [owner, repo, user, path]);

  return {session, sessionId};
}
