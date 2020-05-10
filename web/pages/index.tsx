import React from 'react';
import {GithubReposList} from '../components/GithubReposList';
import {Header} from '../components/Header';
import {InstallGithubAppsButton} from '../components/InstallGithubAppsButton';
import * as UI from '../components/ui';
import {useAuthorizedUser} from '../middlewares/useAuthorizedUser';

export default () => {
  const {user, isPending} = useAuthorizedUser();
  return (
    <UI.Box>
      <Header />

      {user ? (
        <>
          <UI.Container mt={6}>
            <InstallGithubAppsButton />
          </UI.Container>
          <UI.Container mt={6}>
            <GithubReposList {...{user}} />
          </UI.Container>
        </>
      ) : isPending ? (
        <UI.Container mt={6}>
          <UI.Text>Loading Vivliostyle Editor...</UI.Text>
        </UI.Container>
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Login and start writing!</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};
