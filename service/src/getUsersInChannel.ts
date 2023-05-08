import makeRequest from './makeRequest';

const getUsersInChannel = async ({ channelID }) => {
  return makeRequest(`chat/get-users-in-channel?channel=${channelID}`, {
    method: 'GET'
  });
};

export default getUsersInChannel;
