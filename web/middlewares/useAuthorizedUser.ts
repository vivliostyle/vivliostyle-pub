import { useState, useEffect } from 'react';
import firebase from '../services/firebase';

export const useAuthorizedUser = () => {
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
