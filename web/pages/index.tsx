import React from 'react';
import { Header } from '../component/Header';
import { InstallGithubAppsButton } from '../component/InstallGithubAppsButton';
import * as UI from '../component/ui';

export default () => (
  <UI.Box>
    <Header />
    <UI.Container mt={6}>
      <UI.Heading as="h3">Hello world</UI.Heading>
      <InstallGithubAppsButton />
    </UI.Container>
  </UI.Box>
);
