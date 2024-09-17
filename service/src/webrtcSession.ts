import makeRequest from "./makeRequest";

export const webrtcSession = ({ description, sender, channelId }) => {
    return makeRequest('session', {
      method: 'POST',
      body: {
        description,
        sender,
        channel: channelId
      }
    });
  };