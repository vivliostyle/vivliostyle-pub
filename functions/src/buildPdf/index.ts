import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';

if (!admin.apps.length) {
  admin.initializeApp(functions.config().firebase);
}
const firestore = admin.firestore();

const publishMessage = async(topicName:string, data:any) => {
  const pubSubClient = new PubSub();
  const stringifiedData = JSON.stringify(data);
  const messageId = await pubSubClient.topic(topicName).publish(Buffer.from(stringifiedData));
  console.log(`>> Message ${messageId} published.`);
  return messageId;
}

export const buildPDF = functions.https.onCall(async(repoInfo, context) => {
  const ref = await firestore.collection('builds').add({
    url: null, 
    repo: repoInfo
  });
  await publishMessage("buildRequest", {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    id: ref.id
  });
  return { buildID : ref.id };
})
