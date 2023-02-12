import makeRequest from '../utils/makeRequest';

const unlockChannel = async ( channelId, sender ) => {
  return makeRequest(`chat/channel-unlock/${channelId}/${sender}`, {
    method: 'GET'
  });
};

export default unlockChannel;
