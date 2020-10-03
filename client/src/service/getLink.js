import makeRequest from '../utils/makeRequest';

const getLink = async () => {
  return makeRequest('chat-link', {
    method: 'POST'
  });
};

export default getLink;
