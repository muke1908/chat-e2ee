import makeRequest from '../utils/makeRequest';

const sendMessage = async ({ channelID, userId, image, text }) => {
  await makeRequest('chat/message', {
    method: 'POST',
    body: {
      channel: channelID,
      sender: userId,
      message: text,
      image
    }
  });
};

export default sendMessage;
