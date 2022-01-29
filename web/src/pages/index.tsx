import React from 'react';
import * as UI from '@components/ui';
import {GithubReposList} from '@components/GithubReposList';
import {GithubAppsButtonGroup} from '@components/GithubAppsButtonGroup';
import { useAppContext } from '@middlewares/contexts/useAppContext';

const Index = () => {
  const app = useAppContext();
  console.log('[Index]',app.user);
  return (
    <UI.Box>
      {app.user ? (
        <>
          <UI.Container mt={6}>
            <GithubAppsButtonGroup />
          </UI.Container>
          <UI.Container mt={6}>
            <GithubReposList />
          </UI.Container>
        </>
      ) : (
        <UI.Container mt={6}>
          <UI.Text>Login and start writing!</UI.Text>
        </UI.Container>
      )}
    </UI.Box>
  );
};

export default Index;
