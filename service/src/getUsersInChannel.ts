import makeRequest from './makeRequest';

const getUsersInChannel = async ({ channelID }: { channelID?: string }) => {
  return makeRequest(`chat/get-users-in-channel?channel=${channelID}`, {
    method: 'GET'
  });
};

export default getUsersInChannel;
