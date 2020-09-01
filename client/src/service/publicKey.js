import makeRequest from '../utils/makeRequest';

export const sharePublicKey = ({ publicKey, sender, channel }) => {
  return makeRequest('chat/share-public-key', {
    method: 'POST',
    body: {
      publicKey,
      sender,
      channel
    }
  });
};

export const getPublicKey = ({ userId, channel }) => {
  return makeRequest(`chat/get-public-key/?userId=${userId}&channel=${channel}`, {
    method: 'GET'
  });
};
