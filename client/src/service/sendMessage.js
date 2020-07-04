import makeRequest from '../utils/request';

const sendMessage = async ({ uuid, userId, text }) => {
  await makeRequest('chat/send', {
    method: 'POST',
    body: {
      channel: uuid,
      sender: userId,
      message: text
    }
  });
};

export default sendMessage;
