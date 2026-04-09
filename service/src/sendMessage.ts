import makeRequest from './makeRequest';

const sendMessage = ({ channelID, userId, text }: { channelID?: string, userId?: string, text: string }) => {
  return makeRequest('chat/message', {
    method: 'POST',
    body: {
      channel: channelID,
      sender: userId,
      message: text,
    }
  });
};

export default sendMessage;
