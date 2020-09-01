import makeRequest from '../utils/makeRequest';

const getLink = async ({ token }) => {
  return makeRequest('/chat-link', {
    method: 'POST',
    body: { token }
  });
};

export default getLink;
