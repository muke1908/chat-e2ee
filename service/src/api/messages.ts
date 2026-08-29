import makeRequest from './client';
import type { TypeUsersInChannel } from '../public/types';

/** List the users currently present in a channel. */
export const getUsersInChannel = async ({ channelID }: { channelID?: string }): Promise<TypeUsersInChannel> => {
  return makeRequest<TypeUsersInChannel>(`chat/get-users-in-channel?channel=${channelID}`, {
    method: 'GET'
  });
};
