import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import { Header } from '../../../components/Header';
import { MarkdownEditor } from '../../../components/MarkdownEditor';
import * as UI from '../../../components/ui';
import { useAuthorizedUser } from '../../../middlewares/useAuthorizedUser';
import firebase from '../../../services/firebase';
import { GithubRequestSessionApiResponse } from '../../api/github/requestSession';

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

  useEffect(() => {
    if (!user) {
      return;
    }
    (async () => {
      const idToken = await user.getIdToken();
      const { id }: GithubRequestSessionApiResponse = await fetch(
        '/api/github/requestSession',
        {
          method: 'POST',
          body: JSON.stringify({ owner, repo }),
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        }
      ).then((r) => r.json());
      const session = await firebase
        .firestore()
        .collection('users')
        .doc(user.uid)
        .collection('sessions')
        .doc(id);
      setSession(session);
    })();
  }, [owner, repo, user]);

  return { session };
};

export default () => {
  const { user, isPending } = useAuthorizedUser();
  const router = useRouter();
  // check login
  useEffect(() => {
    if (!user && !isPending) {
      router.replace('/');
    }
  }, [user, isPending]);

  const [text, setText] = useState('');
  const [status, setStatus] = useState<'init' | 'clean' | 'modified' | 'saved'>(
    'init'
  );

  const { owner, repo } = router.query;
  const { session } = useEditorSession({
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
      console.log(doc.metadata.hasPendingWrites ? 'Local' : 'Server', data);
      if (!data?.text || doc.metadata.hasPendingWrites) {
        return;
      }
      setText(data.text);
      setStatus('clean');
    });
  }, [session]);

  const onModified = useCallback(() => {
    setStatus('modified');
  }, []);
  const onUpdate = useCallback(
    (updatedText) => {
      if (!session || updatedText === text) {
        return;
      }
      setText(updatedText);
      session.update({ text: updatedText }).then(() => {
        setStatus('saved');
      });
    },
    [text, session]
  );
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
        </UI.Flex>
      </UI.Flex>
      {!isPending && status !== 'init' ? (
        <MarkdownEditor value={text} {...{ onModified, onUpdate }} />
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Loading</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
