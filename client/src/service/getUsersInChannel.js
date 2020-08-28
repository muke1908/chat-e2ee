import makeRequest from '../utils/makeRequest';

const getUsersInChannel = async ({ channel }) => {
  return makeRequest(`chat/get-users-in-channel?channel=${channel}`, {
    method: 'GET'
  });
};

export default getUsersInChannel;
