import makeRequest from './makeRequest';
import { IGetPublicKeyReturn } from './public/types';

export const sharePublicKey = ({ aesKey, publicKey, sender, channelId }) => {
  return makeRequest('chat/share-public-key', {
    method: 'POST',
    body: {
      aesKey,
      publicKey,
      sender,
      channel: channelId
    }
  });
};

export const getPublicKey = ({ userId, channelId }): Promise<IGetPublicKeyReturn> => {
  return makeRequest(`chat/get-public-key/?userId=${userId}&channel=${channelId}&timeStamp=${Date.now()}`, {
    method: 'GET'
  });
};
