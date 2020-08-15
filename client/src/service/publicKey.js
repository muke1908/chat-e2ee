import makeRequest from '../utils/makeRequest';

export const sharePublicKey = ({ publicKey, sender, channel }) => {
  return makeRequest('chat/sharePublicKey', {
    method: 'POST',
    body: {
      publicKey,
      sender,
      channel
    }
  });
};

export const getPublicKey = ({ userId, channel }) => {
  return makeRequest(`chat/getPublicKey/?userId=${userId}&channel=${channel}`, {
    method: 'GET'
  });
};
