import makeRequest from './client';

type WebRtcSessionBody = { description: unknown, sender: string, channel: string };

/** Exchange a WebRTC session description (offer/answer/ICE candidate) via the signaling server. */
export const webrtcSession = ({ description, sender, channelId }: { description: unknown, sender: string, channelId: string }): Promise<unknown> => {
  return makeRequest<unknown, WebRtcSessionBody>('session', {
    method: 'POST',
    body: {
      description,
      sender,
      channel: channelId
    }
  });
};
