import {initializeApp, getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {Webhooks, createNodeMiddleware} from '@octokit/webhooks';

if (!getApps().length) initializeApp(functions.config().firebase);
const firestore = getFirestore();

const getEnv = (key: string) =>
  process.env.FIREBASE_CONFIG
    ? functions.config()['githubapp'][
        key.toLowerCase().replace(/[^a-z0-9]/g, '')
      ]
    : process.env[`GH_APP_${key}`];

const webhooks = new Webhooks({
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

webhooks.onError((error) => {
  console.log(error.stack);
});

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const middleware = createNodeMiddleware(webhooks, {path: '/'});

export const webhookHandler = functions.https.onRequest(async (req, res) => {
  if (typeof req.body === 'object') {
    req.body = JSON.stringify(req.body);
  }
  if (await middleware(req, res)) return;
  res.writeHead(404);
  res.end();
});
