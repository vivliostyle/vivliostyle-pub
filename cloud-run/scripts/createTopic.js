'use strict';

const {PubSub} = require('@google-cloud/pubsub');

async function main(topicName) {
  const pubSubClient = new PubSub();
  const [topic] = await pubSubClient.createTopic(topicName);
  const createPushSubscription = async() => {
    const options = { pushConfig: {pushEndpoint: `http://localhost:8080/`,},};
    const subscriptionName = 'test';
    await pubSubClient.topic(topicName).createSubscription(subscriptionName, options);
    console.log(`Subscription ${subscriptionName} created.`);
  }
  await createPushSubscription().catch(console.error);
}


(async() => {
  await main(...process.argv.slice(1));
})();
