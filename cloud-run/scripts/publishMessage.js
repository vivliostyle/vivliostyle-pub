'use strict';

const main = async (topicName, data) => {
  const {PubSub} = require('@google-cloud/pubsub');
  const pubSubClient = new PubSub();
  const messageId = await pubSubClient
    .topic(topicName)
    .publish(Buffer.from(data));
  console.log(`>> Message ${messageId} published.`);
};

main(...process.argv.slice(2))
  .then(process.exit)
  .catch(console.error);
