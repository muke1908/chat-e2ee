import makeRequest from './client';
import type { ISendMessageReturn, TypeUsersInChannel } from '../public/types';

type SendMessageBody = { channel?: string, sender?: string, message: string, image: string };

/** Send a message (text/image) to a channel. */
export const sendMessage = ({ channelID, userId, image, text }: { channelID?: string, userId?: string, image: string, text: string }): Promise<ISendMessageReturn> => {
  return makeRequest<ISendMessageReturn, SendMessageBody>('chat/message', {
    method: 'POST',
    body: {
      channel: channelID,
      sender: userId,
      message: text,
      image
    }
  });
};

/** List the users currently present in a channel. */
export const getUsersInChannel = async ({ channelID }: { channelID?: string }): Promise<TypeUsersInChannel> => {
  return makeRequest<TypeUsersInChannel>(`chat/get-users-in-channel?channel=${channelID}`, {
    method: 'GET'
  });
};
