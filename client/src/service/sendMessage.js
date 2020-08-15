import makeRequest from '../utils/makeRequest';

const sendMessage = async ({ channelID, userId, text }) => {
  await makeRequest('chat/send', {
    method: 'POST',
    body: {
      channel: channelID,
      sender: userId,
      message: text
    }
  });
};

export default sendMessage;
