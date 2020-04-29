import React from 'react';
import { Header } from '../component/Header';
import { InstallGithubAppsButton } from '../component/InstallGithubAppsButton';
import { MarkdownEditor } from '../component/MarkdownEditor';
import * as UI from '../component/ui';
import { useAuthorizedUser } from '../middlewares/useAuthorizedUser';

export default () => {
  const { user, isPending } = useAuthorizedUser();
  return (
    <UI.Box>
      <Header />
      <UI.Container mt={6}>
        <InstallGithubAppsButton />
      </UI.Container>
      {user ? (
        <MarkdownEditor />
      ) : (
        <UI.Container mt={6}>
          {isPending ? (
            <UI.Text>Loading</UI.Text>
          ) : (
            <UI.Text>Start writing by login.</UI.Text>
          )}
        </UI.Container>
      )}
    </UI.Box>
  );
};
