import makeRequest from './makeRequest';

const getChatLink = async (pin: string) => {
  return makeRequest(`chat-link/${pin}`, {
    method: 'GET'
  });
};

export default getChatLink;
