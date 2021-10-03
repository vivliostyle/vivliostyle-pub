import React, {useEffect} from 'react';
import Link from 'next/link';
import {useAuthorizedUser} from '@middlewares/useAuthorizedUser';
import firebase from '@services/firebase';
import * as UI from './ui';

const signIn = async () => {
  const provider = new firebase.auth.GithubAuthProvider();
  await firebase.auth().signInWithRedirect(provider);
};

const signOut = async () => {
  await firebase.auth().signOut();
};

const HeaderUserInfo: React.FC = () => {
  const {user, isPending} = useAuthorizedUser();
  useEffect(() => {
    if (user) {
      console.log(user.providerData);

      user.getIdTokenResult(true).then((data) => console.log(data));
    }
  }, [user]);
  if (isPending) {
    return null;
  }
  return (
    <>
      {user && <UI.Text mr={2}>logged in as {user.displayName}</UI.Text>}
      {user && (
        <UI.Button
          variant="outline"
          colorScheme="blackAlpha"
          onClick={signOut}
        >
          Logout
        </UI.Button>
      )}
      {!user && (
        <UI.Button variant="outline" colorScheme="blackAlpha" onClick={signIn}>
          Login
        </UI.Button>
      )}
    </>
  );
};

export const Header: React.FC = () => (
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
