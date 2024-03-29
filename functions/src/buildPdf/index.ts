import {initializeApp, getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';

if (!getApps().length) initializeApp(functions.config().firebase);
const firestore = getFirestore();

const publishMessage = async(topicName:string, data:any) => {
  const pubSubClient = new PubSub();
  const stringifiedData = JSON.stringify(data);
  const messageId = await pubSubClient.topic(topicName).publish(Buffer.from(stringifiedData));
  console.log(`>> Message ${messageId} published.`);
  return messageId;
}

export const buildPDF = functions.https.onCall(async(repoInfo, context) => {
  const ref = await firestore.collection(`users/${context.auth?.uid}/builds`).add({
    url: null, 
    repo: repoInfo
  });
  await publishMessage("buildRequest", {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    branch: repoInfo.branch,
    themeName: repoInfo.themeName,
    httpMode: repoInfo.httpMode,
    uid: context.auth?.uid,
    id: ref.id,
  });
  return { buildID : ref.id };
})
