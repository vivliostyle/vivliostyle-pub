import React from 'react';
import { Header } from '../component/header';
import * as UI from '../component/ui';

export default () => (
  <UI.Box>
    <Header />
    <UI.Container mt={6}>
      <UI.Heading as="h3">Hello world</UI.Heading>
    </UI.Container>
  </UI.Box>
);
