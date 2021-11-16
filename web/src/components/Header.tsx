import React, {useEffect} from 'react';
import Link from 'next/link';
import {useAuthorizedUser} from '@middlewares/useAuthorizedUser';
import firebase from '@services/firebase';
import { getAuth, signInWithRedirect, GithubAuthProvider } from 'firebase/auth';
import * as UI from './ui';

const provider = new GithubAuthProvider();

const signIn = async () => {
  const auth = getAuth(firebase);
  signInWithRedirect(auth, provider);
};

const signOut = async () => {
  const auth = getAuth(firebase);
  await auth.signOut();
};

const HeaderUserInfo: React.FC = () => {
  const {user, isPending} = useAuthorizedUser();
  useEffect(() => {
    if (user) {
      console.log('providerData',user.providerData);

      user.getIdTokenResult(true).then((data) => console.log('idTokenResult',data));
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
