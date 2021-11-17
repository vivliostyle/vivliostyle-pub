import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"


const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

const apps = getApps();

let firebaseApp:FirebaseApp|undefined;

if(!apps.length) {
  // console.log('config',firebaseConfig);
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = apps[0];
}

export default firebaseApp;
export const db = getFirestore();