'use strict';

const main = async (topicName, subscriptionName) => {
  const {PubSub} = require('@google-cloud/pubsub');
  const pubSubClient = new PubSub({
    
  });
  const [topic] = await pubSubClient.createTopic(topicName);
  console.log(`>> Topic ${topicName} created.`);
  const options = {pushConfig: {pushEndpoint: `http://localhost:8080/`}};
  await pubSubClient
    .topic(topicName)
    .createSubscription(subscriptionName, options);
  console.log(`>> Subscription ${subscriptionName} created.`);
};

main(...process.argv.slice(2))
  .then(process.exit)
  .catch(console.error);
