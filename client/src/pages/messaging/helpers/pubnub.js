import PubNub from 'pubnub';

export const fetchMessages = (pubnub, channelID) => {
  return new Promise((resolve, reject) => {
    pubnub.fetchMessages(
      {
        channels: [channelID],
        count: 100
      },
      (status, response) => {
        if (status.error) {
          reject(status);
        }

        const messages = response.channels[channelID]
          ? response.channels[channelID].map(({ message }) => message)
          : [];
        resolve(messages);
      }
    );
  });
};

export const getUsersInChannel = (pubnub, channelID) => {
  return new Promise((resolve, reject) => {
    pubnub.hereNow(
      {
        channels: [channelID],
        includeUUIDs: true,
        includeState: true
      },
      (status, response) => {
        if (status.error) {
          reject(status);
        }

        const users = response.channels[channelID] ? response.channels[channelID].occupants : [];
        resolve(users);
      }
    );
  });
};

export const pubnubInit = ({ subscribeKey, userId, channelID }) => {
  const pubnub = new PubNub({
    subscribeKey: subscribeKey,
    uuid: userId,
    heartbeatInterval: 5,
    presenceTimeout: 10
  });

  pubnub.subscribe({
    channels: [channelID],
    withPresence: true
  });

  return pubnub;
};
