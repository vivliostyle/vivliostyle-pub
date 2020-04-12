import React from 'react';
import * as UI from './ui';

export const Header = () => (
  <UI.Box w="100%" backgroundColor="gray.200">
    <UI.Container py={2} justify="space-between" align="center">
      <UI.Heading size="sm">Vivliostyle Pub</UI.Heading>
      <UI.Button variant="outline" variantColor="blackAlpha">
        Login
      </UI.Button>
    </UI.Container>
  </UI.Box>
);
