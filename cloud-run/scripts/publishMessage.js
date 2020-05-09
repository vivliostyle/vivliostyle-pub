'use strict';

const {PubSub} = require('@google-cloud/pubsub');

async function main(topicName,data) {
  const pubSubClient = new PubSub();
  const [topic] = await pubSubClient.createTopic(topicName);
  const createPushSubscription = async() => {
    const options = { pushConfig: {pushEndpoint: `http://localhost:8080/`,},};
    const subscriptionName = 'test';
    await pubSubClient.topic(topicName).createSubscription(subscriptionName, options);
    console.log(`Subscription ${subscriptionName} created.`);
  }
  await createPushSubscription().catch(console.error);
  const publishMessage = async() => {
    const dataBuffer = Buffer.from(data);
    const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
    console.log(`Message ${messageId} published.`);
  }
  await publishMessage().catch(console.error);
}


(async() => {
  await main(...process.argv.slice(2));
})();
