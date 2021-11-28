import {useState, useEffect} from 'react';
import { User,onAuthStateChanged, getAuth } from 'firebase/auth';
import firebase from "@services/firebase";

export const useAuthorizedUser = () => {
  const [isPending, setPending] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth(firebase);
    const unsubscriber = onAuthStateChanged(auth,user => {
      if(user) user.getIdToken(true);
      setUser(user);
      setPending(false);
    });
    return () => unsubscriber();
  }, []);

  return {user, isPending};
};
