import makeRequest from '../utils/makeRequest';

const sendMessage = ({ channelID, userId, image, text }) => {
  return makeRequest('chat/message', {
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
