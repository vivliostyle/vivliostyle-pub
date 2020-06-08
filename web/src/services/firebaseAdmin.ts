import * as admin from 'firebase-admin';

import {firebaseAdminServiceAccount} from '@utils/keys';

if (!admin.apps.length) {
  const {databaseURL} = JSON.parse(process.env.FIREBASE_CONFIG);

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseAdminServiceAccount.project_id,
      clientEmail: firebaseAdminServiceAccount.client_email,
      privateKey: firebaseAdminServiceAccount.private_key,
    }),
    databaseURL,
  });
}

export default admin;
