import React, {useEffect, useCallback, useState} from 'react';
import styled from '@emotion/styled';
import {useRouter} from 'next/router';
import fetch from 'isomorphic-unfetch';
import {CommitSessionButton} from '../../../components/CommitSessionButton';
import {Header} from '../../../components/Header';
import {MarkdownEditor} from '../../../components/MarkdownEditor';
import * as UI from '../../../components/ui';
import {useAuthorizedUser} from '../../../middlewares/useAuthorizedUser';
import firebase from '../../../services/firebase';
import {GithubRequestSessionApiResponse} from '../../api/github/requestSession';
import {Viewer} from '../../../components/VivliostyleViewer';

const useEditorSession = ({
  owner,
  repo,
  user,
}: {
  owner: string;
  repo: string;
  user: firebase.User | null;
}) => {
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
          body: JSON.stringify({owner, repo}),
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
  }, [owner, repo, user]);

  return {session, sessionId};
};

export default () => {
  const {user, isPending} = useAuthorizedUser();
  const router = useRouter();

  // check login
  useEffect(() => {
    if (!user && !isPending) {
      router.replace('/');
    }
  }, [user, isPending]);

  const [text, setText] = useState('');
  const [status, setStatus] = useState<'init' | 'clean' | 'modified' | 'saved'>(
    'init',
  );

  const {owner, repo} = router.query;
  const {session, sessionId} = useEditorSession({
    user,
    owner: Array.isArray(owner) ? owner[0] : owner,
    repo: Array.isArray(repo) ? repo[0] : repo,
  });

  useEffect(() => {
    if (!session) {
      return;
    }
    return session.onSnapshot((doc) => {
      const data = doc.data();
      if (!data?.text || data.text === text || doc.metadata.hasPendingWrites) {
        return;
      }
      setText(data.text);
      setStatus('clean');
    });
  }, [session, text]);

  const onModified = useCallback(() => {
    setStatus('modified');
  }, []);
  const onUpdate = useCallback(
    (updatedText) => {
      if (!session || updatedText === text) {
        return;
      }
      setText(updatedText);
      session
        .update({
          userUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          text: updatedText,
        })
        .then(() => {
          setStatus('saved');
        });
    },
    [text, session],
  );
  const onDidSaved = useCallback(() => {
    setStatus('clean');
  }, []);

  return (
    <UI.Box>
      <Header />
      <UI.Flex
        w="100%"
        h={12}
        borderBottomWidth={1}
        borderBottomColor="gray.300"
      >
        <UI.Flex w="100%" px={8} justify="flex-start" align="center">
          {status === 'saved' && <UI.Text>Document updated</UI.Text>}
          {user && sessionId && (
            <CommitSessionButton
              {...{user, sessionId, onDidSaved}}
              disabled={status !== 'saved'}
            />
          )}
        </UI.Flex>
      </UI.Flex>
      {!isPending && status !== 'init' ? (
        <UI.Flex>
          <MarkdownEditor value={text} {...{onModified, onUpdate}} />
          <Viewer />
        </UI.Flex>
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Loading</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
