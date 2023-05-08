import makeRequest from './makeRequest';

export const sharePublicKey = ({ publicKey, sender, channelId }) => {
  return makeRequest('chat/share-public-key', {
    method: 'POST',
    body: {
      publicKey,
      sender,
      channel: channelId
    }
  });
};

export const getPublicKey = ({ userId, channelId }) => {
  return makeRequest(`chat/get-public-key/?userId=${userId}&channel=${channelId}`, {
    method: 'GET'
  });
};
