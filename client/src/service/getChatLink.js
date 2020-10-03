import makeRequest from '../utils/makeRequest';

const getChatLink = async (pin) => {
  return makeRequest(`chat-link/${pin}`, {
    method: 'GET'
  });
};

export default getChatLink;
