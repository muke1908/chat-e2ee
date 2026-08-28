import makeRequest from './client';
import type { IGetPublicKeyReturn } from '../public/types';

type SharePublicKeyBody = { aesKey: string | null, publicKey?: string, sender?: string, channel?: string };

/** Share our RSA public key (and, once known, our RSA-encrypted AES key) with the channel. */
export const sharePublicKey = ({ aesKey, publicKey, sender, channelId }: { aesKey: string | null, publicKey?: string, sender?: string, channelId?: string }): Promise<unknown> => {
  return makeRequest<unknown, SharePublicKeyBody>('chat/share-public-key', {
    method: 'POST',
    body: {
      aesKey,
      publicKey,
      sender,
      channel: channelId
    }
  });
};

/** Fetch the receiver's RSA public key (and AES key material, if already shared). */
export const getPublicKey = ({ userId, channelId }: { userId?: string, channelId?: string }): Promise<IGetPublicKeyReturn> => {
  return makeRequest<IGetPublicKeyReturn>(`chat/get-public-key/?userId=${userId}&channel=${channelId}&timeStamp=${Date.now()}`, {
    method: 'GET'
  });
};
