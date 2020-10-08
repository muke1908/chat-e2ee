import makeRequest from '../utils/makeRequest';

const deleteLink = async ({ channelID }) => {
  return makeRequest(`/chat-link/${channelID}`, {
    method: 'DELETE'
  });
};

export default deleteLink;
