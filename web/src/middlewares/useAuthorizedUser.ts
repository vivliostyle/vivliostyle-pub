import {useState, useEffect} from 'react';

import firebase from '@services/firebase';

export const useAuthorizedUser = () => {
  const [isPending, setPending] = useState(true);
  const [user, setUser] = useState<firebase.User | null>(null);

  // throw new Error("ギャア！")

  useEffect(() => {
    const unsubscriber = firebase.auth().onAuthStateChanged(user => {
      if(user) user.getIdToken(true);
      setUser(user);
      setPending(false);
    });
    return () => unsubscriber()
  }, []);

  return {user, isPending};
};
