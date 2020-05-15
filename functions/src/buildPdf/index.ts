import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';

if (!admin.apps.length) {
  admin.initializeApp(functions.config().firebase);
}

const publishMessage = async(topicName:string, data:string) => {
  const pubSubClient = new PubSub();
  const messageId = await pubSubClient.topic(topicName).publish(Buffer.from(data));
  console.log(`>> Message ${messageId} published.`);
  return messageId;
}

export const buildPDF = functions.https.onCall(async(data, context) => {
  const id = await publishMessage("buildRequest", data.repository)
  return { id };
})
