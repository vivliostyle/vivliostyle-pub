import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

if (!firebase.apps.length) {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
