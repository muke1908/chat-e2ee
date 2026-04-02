import makeRequest from './makeRequest';

const deleteLink = async ({ channelID }: { channelID?: string }) => {
  return makeRequest(`/chat-link/${channelID}`, {
    method: 'DELETE'
  });
};

export default deleteLink;
