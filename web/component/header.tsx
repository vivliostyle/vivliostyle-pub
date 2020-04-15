import React, { useState, useEffect } from 'react';
import firebase from '../services/firebase';
import * as UI from './ui';

const signIn = async () => {
  const provider = new firebase.auth.GithubAuthProvider();
  await firebase.auth().signInWithRedirect(provider);
};

const signOut = async () => {
  await firebase.auth().signOut();
};

const useAuthorizedUser = () => {
  const [isPending, setPending] = useState(true);
  const [user, setUser] = useState<firebase.User | null>(null);

  useEffect(() => {
    return firebase.auth().onAuthStateChanged((user) => {
      setPending(false);
      setUser(user);
    });
  }, []);

  return { user, isPending };
};

const HeaderUserInfo: React.FC = () => {
  const { user, isPending } = useAuthorizedUser();
  if (isPending) {
    return null;
  }
  return (
    <>
      {user && <UI.Text mr={2}>logged in as {user.displayName}</UI.Text>}
      {user && (
        <UI.Button
          variant="outline"
          variantColor="blackAlpha"
          onClick={signOut}
        >
          Logout
        </UI.Button>
      )}
      {!user && (
        <UI.Button variant="outline" variantColor="blackAlpha" onClick={signIn}>
          Login
        </UI.Button>
      )}
    </>
  );
};

export const Header: React.FC = () => (
  <UI.Flex w="100%" h={16} backgroundColor="gray.200">
    <UI.Container w="100%" justify="space-between" align="center">
      <UI.Heading size="sm">Vivliostyle Pub</UI.Heading>
      <UI.Flex align="center">
        <HeaderUserInfo />
      </UI.Flex>
    </UI.Container>
  </UI.Flex>
);
