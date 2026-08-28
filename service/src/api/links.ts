import makeRequest from './client';
import type { LinkObjType } from '../public/types';

/** Create a new chat link/channel. */
export const getLink = async (): Promise<LinkObjType> => {
  return makeRequest<LinkObjType>('chat-link', {
    method: 'POST'
  });
};

/** Look up an existing chat link by its short pin. */
export const getChatLink = async (pin: string): Promise<LinkObjType> => {
  return makeRequest<LinkObjType>(`chat-link/${pin}`, {
    method: 'GET'
  });
};

/** Delete a chat link/channel. */
export const deleteLink = async ({ channelID }: { channelID?: string }): Promise<unknown> => {
  return makeRequest<unknown>(`/chat-link/${channelID}`, {
    method: 'DELETE'
  });
};
