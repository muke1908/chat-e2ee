import makeRequest from '../utils/makeRequest';

const getLink = async (pin) => {
  return makeRequest(`/chat-link/${pin}`, {
    method: 'GET'
  });
};

export default getLink;
