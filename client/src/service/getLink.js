import makeRequest from '../utils/makeRequest';

const getLink = async ({ token }) => {
  return makeRequest('/chat-link/generate', {
    method: 'POST',
    body: { token }
  });
};

export default getLink;
