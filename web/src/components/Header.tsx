import React from 'react';
import Link from 'next/link';
import * as UI from './ui';
import { useAppContext } from '@middlewares/useAppContext';


const HeaderUserInfo: React.FC = () => {
  const app = useAppContext();
  console.log('user',app.user);
  return (
    <>
      {app.user ? (
        <>
        <UI.Text mr={2}>logged in as {app.user.displayName}</UI.Text>
        <UI.Button
          variant="outline"
          colorScheme="blackAlpha"
          onClick={app.signOut}
        >
          Logout
        </UI.Button>
        </>
      ) : (
        <UI.Button variant="outline" colorScheme="blackAlpha" onClick={app.signIn}>
          Login
        </UI.Button>
      )}
    </>
  );
};

export const Header: React.FC = () => {
  console.log('Header');
  return (
  <UI.Flex w="100%" h={16} backgroundColor="gray.200">
    <UI.Container w="100%" justify="space-between" align="center">
      <Link href="/">
        <a>
          <UI.Heading size="sm">Vivliostyle Pub</UI.Heading>
        </a>
      </Link>
      <UI.Flex align="center">
        <HeaderUserInfo />
      </UI.Flex>
    </UI.Container>
  </UI.Flex>
);
};