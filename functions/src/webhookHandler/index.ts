import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as WebhooksApi from '@octokit/webhooks';

if (!admin.apps.length) {
  admin.initializeApp(functions.config().firebase);
}
const firestore = admin.firestore();

const secret = `223fb84f23fcbb28a67d8b200ff6713915a927fb`;

const webhooks = new WebhooksApi({
  secret: secret,
});

webhooks.on('installation', (event) => {
  const { action, installation } = event.payload;
  if (action === 'created' || action === 'new_permissions_accepted') {
    firestore
      .collection('installations')
      .doc(`${installation.id}`)
      .set(installation);
  } else if (action === 'deleted') {
    firestore.collection('installations').doc(`${installation.id}`).delete();
  }
});

webhooks.on('error', (error) => {
  console.log(error.stack);
});

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const webhookHandler = functions.https.onRequest(webhooks.middleware);
