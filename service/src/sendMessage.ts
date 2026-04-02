import makeRequest from './makeRequest';

const sendMessage = ({ channelID, userId, image, text }: { channelID?: string, userId?: string, image: string, text: string }) => {
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
