import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import { Header } from '../../../components/Header';
import { MarkdownEditor } from '../../../components/MarkdownEditor';
import * as UI from '../../../components/ui';
import { useAuthorizedUser } from '../../../middlewares/useAuthorizedUser';

const useEditorSession = ({
  owner,
  repo,
  user,
}: {
  owner: string;
  repo: string;
  user?: firebase.User;
}) => {
  useEffect(() => {
    if (!user) {
      return;
    }
    (async () => {
      const idToken = await user.getIdToken();
      const ret = await fetch('/api/github/requestSession', {
        method: 'POST',
        body: JSON.stringify({ owner, repo }),
        headers: {
          'content-type': 'application/json',
          'x-id-token': idToken,
        },
      }).then((r) => r.json());
      console.log(ret);
    })();
  }, [owner, repo, user]);
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

  const { owner, repo } = router.query;
  useEditorSession({
    user,
    owner: Array.isArray(owner) ? owner[0] : owner,
    repo: Array.isArray(repo) ? repo[0] : repo,
  });

  const [text, setText] = useState('');
  const [status, setStatus] = useState<'init' | 'modified' | 'saved'>('init');
  const onModified = useCallback(() => {
    setStatus('modified');
  }, []);
  const onUpdate = useCallback(
    (updatedText) => {
      if (updatedText === text) {
        return;
      }
      setText(updatedText);
      setStatus('saved');
    },
    [text]
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
      {!isPending ? (
        <MarkdownEditor {...{ onModified, onUpdate }} />
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Loading</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
