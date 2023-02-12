import makeRequest from '../utils/makeRequest';

const lockChannel = async (channelId, sender) => {
    return makeRequest(`chat/channel-lock/${channelId}/${sender}`, {
        method: 'GET'
    });
};

export default lockChannel;
