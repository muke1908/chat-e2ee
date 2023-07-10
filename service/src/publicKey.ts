import makeRequest from './makeRequest';
import { IGetPublicKeyReturn } from './public/types';

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

export const getPublicKey = ({ userId, channelId }): Promise<IGetPublicKeyReturn> => {
  return makeRequest(`chat/get-public-key/?userId=${userId}&channel=${channelId}`, {
    method: 'GET'
  });
};
