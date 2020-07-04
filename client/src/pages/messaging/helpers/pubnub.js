import PubNub from 'pubnub';

export const fetchMessages = (pubnub, uuid) => {
  return new Promise((resolve, reject) => {
    pubnub.fetchMessages(
      {
        channels: [uuid],
        count: 100
      },
      (status, response) => {
        if (status.error) {
          reject(status);
        }

        const messages = response.channels[uuid]
          ? response.channels[uuid].map(({ message }) => message)
          : [];
        resolve(messages);
      }
    );
  });
};

export const getUsersInChannel = (pubnub, uuid) => {
  return new Promise((resolve, reject) => {
    pubnub.hereNow(
      {
        channels: [uuid],
        includeUUIDs: true,
        includeState: true
      },
      (status, response) => {
        if (status.error) {
          reject(status);
        }

        const users = response.channels[uuid] ? response.channels[uuid].occupants : [];
        resolve(users);
      }
    );
  });
};

export const pubnubInit = ({ subscribeKey, userId, uuid }) => {
  const pubnub = new PubNub({
    subscribeKey: subscribeKey,
    uuid: userId,
    heartbeatInterval: 5,
    presenceTimeout: 10
  });

  pubnub.subscribe({
    channels: [uuid],
    withPresence: true
  });

  return pubnub;
};
