import makeRequest from '../utils/makeRequest';

const sendMessage = async ({ channelID, userId, image, text, id }) => {
  await makeRequest('chat/message', {
    method: 'POST',
    body: {
      channel: channelID,
      sender: userId,
      message: text,
      image,
      id
    }
  });
};

export default sendMessage;
