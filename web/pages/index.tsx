import React from 'react';
import { GithubReposList } from '../components/GithubReposList';
import { Header } from '../components/Header';
import { InstallGithubAppsButton } from '../components/InstallGithubAppsButton';
import { MarkdownEditor } from '../components/MarkdownEditor';
import * as UI from '../components/ui';
import { useAuthorizedUser } from '../middlewares/useAuthorizedUser';

export default () => {
  const { user, isPending } = useAuthorizedUser();
  return (
    <UI.Box>
      <Header />
      {user && (
        <>
          <UI.Container mt={6}>
            <InstallGithubAppsButton />
          </UI.Container>
          <UI.Container mt={6}>
            <GithubReposList {...{ user }} />
          </UI.Container>
        </>
      )}
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
