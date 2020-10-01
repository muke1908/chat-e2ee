import makeRequest from '../utils/makeRequest';

const getLink = async ({ channelID }) => {
  return makeRequest(`/chat-link/${channelID}`, {
    method: 'DELETE'
  });
};

export default getLink;
