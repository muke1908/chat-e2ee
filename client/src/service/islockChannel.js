import makeRequest from '../utils/makeRequest';

const isLockChannel = async ( channelID ) => {
  return makeRequest(`chat/channel-islock/${channelID}`, {
    method: 'GET'
  });
};

export default isLockChannel;
