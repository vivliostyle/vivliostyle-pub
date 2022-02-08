import React from 'react';
import * as UI from '@components/ui';
import {GithubReposList} from '@components/GithubReposList';
import {GithubAppsButtonGroup} from '@components/GithubAppsButtonGroup';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[Index]');

const Index = () => {
  const app = useAppContext();
  _log(app.state.user);
  return (
    <UI.Box>
      {app.state.user ? (
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
