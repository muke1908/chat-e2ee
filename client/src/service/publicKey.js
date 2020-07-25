import makeRequest from '../utils/request';

export const sharePublicKey = ({ publicKey, sender, channel }) => {
  return makeRequest('chat/updatePublicKey', {
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
