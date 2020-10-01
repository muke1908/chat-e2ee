import makeRequest from '../utils/makeRequest';

const getLink = async () => {
  return makeRequest('/chat-link', {
    method: 'GET'
  });
};

export default getLink;
