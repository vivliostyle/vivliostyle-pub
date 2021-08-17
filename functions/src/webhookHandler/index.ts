import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as WebhooksApi from '@octokit/webhooks';

if (!admin.apps.length) {
  admin.initializeApp(functions.config().firebase);
}
const firestore = admin.firestore();

const getEnv = (key: string) =>
  process.env.FIREBASE_CONFIG
    ? functions.config()['githubapp'][
        key.toLowerCase().replace(/[^a-z0-9]/g, '')
      ]
    : process.env[`GH_APP_${key}`];

const webhooks = new WebhooksApi({
  secret: getEnv('WEBHOOK_SECRET'),
});

webhooks.on('installation', async (event) => {
  const {action, installation} = event.payload;
  if (action === 'created' || action === 'new_permissions_accepted') {
    await firestore
      .collection('installations')
      .doc(`${installation.id}`)
      .set(installation);
  } else if (action === 'deleted') {
    await firestore
      .collection('installations')
      .doc(`${installation.id}`)
      .delete();
  }
});

webhooks.on('error', (error) => {
  console.log(error.stack);
});

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const webhookHandler = functions.https.onRequest(webhooks.middleware);
