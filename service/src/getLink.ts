import makeRequest from './makeRequest';

const getLink = async () => {
  return makeRequest('chat-link', {
    method: 'POST'
  });
};

export default getLink;
