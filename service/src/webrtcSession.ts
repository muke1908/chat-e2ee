import makeRequest from "./makeRequest";

export const webrtcSession = ({ description, sender, channelId }: { description: unknown, sender: string, channelId: string }) => {
    return makeRequest('session', {
      method: 'POST',
      body: {
        description,
        sender,
        channel: channelId
      }
    });
  };