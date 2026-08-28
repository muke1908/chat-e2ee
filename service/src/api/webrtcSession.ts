import makeRequest from './client';
import { type WebRtcSignalPayload } from '../webrtc/types';

type WebRtcSessionBody = {
  signal: WebRtcSignalPayload,
  description: WebRtcSignalPayload,
  sender: string,
  channel: string
};

/** Exchange a WebRTC session description (offer/answer/ICE candidate) via the signaling server. */
export const webrtcSession = ({ signal, sender, channelId }: { signal: WebRtcSignalPayload, sender: string, channelId: string }): Promise<unknown> => {
  return makeRequest<unknown, WebRtcSessionBody>('session', {
    method: 'POST',
    body: {
      // Keep `description` for backward compatibility with older servers.
      description: signal,
      signal,
      sender,
      channel: channelId
    }
  });
};
