const PubNub = require('pubnub');

const subscribeKey = process.env.PUBNUB_SUB_KEY;
const publishKey = process.env.PUBNUB_PUB_KEY;

if (!subscribeKey || !publishKey) {
  // eslint-disable-next-line no-console
  console.error('PUBNUB KEY NOT CONFIGURED!');
}

const pubnub = new PubNub({
  subscribeKey,
  publishKey,
  uuid: 'chat-e2ee'
});

const publishMessage = ({ channel, sender, message }) => {
  const publishPayload = {
    channel,
    message: {
      sender,
      body: message
    }
  };
  return new Promise((resolve, reject) => {
    pubnub.publish(publishPayload, (status, response) => {
      if (status.error) {
        reject(status);
      }

      resolve(response);
    });
  });
};

module.exports = {
  publishMessage
};
