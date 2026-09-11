import makeRequest from './client';
import type { TypeUsersInChannel } from '../public/types';

/** List the users currently present in a channel. */
export const getUsersInChannel = async ({ channelID }: { channelID?: string }): Promise<TypeUsersInChannel> => {
  return makeRequest<TypeUsersInChannel>(`chat/get-users-in-channel?channel=${encodeURIComponent(String(channelID))}`, {
    method: 'GET'
  });
};

/** Older servers ignore countOnly and return the legacy list instead. */
export const getParticipantCount = async ({ channelID }: { channelID?: string }): Promise<number> => {
  const response = await makeRequest<{ count: number } | TypeUsersInChannel>(
    `chat/get-users-in-channel?channel=${encodeURIComponent(String(channelID))}&countOnly=true`,
    { method: 'GET' }
  );
  return Array.isArray(response) ? response.length : response.count;
};
