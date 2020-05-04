import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../../../components/Header';
import { MarkdownEditor } from '../../../components/MarkdownEditor';
import * as UI from '../../../components/ui';
import { useAuthorizedUser } from '../../../middlewares/useAuthorizedUser';

export default () => {
  const { user, isPending } = useAuthorizedUser();
  const router = useRouter();
  // check login
  useEffect(() => {
    if (!user && !isPending) {
      router.replace('/');
    }
  }, [user, isPending]);

  // const { owner, repo } = router.query;
  return (
    <UI.Box>
      <Header />
      {!isPending ? (
        <MarkdownEditor />
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Loading</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
