export interface SignalData {
    type: RTCSdpType;
    sdp: string;
}

/** Signal data shape for an ICE candidate (extends the base SignalData union). */
export interface IceCandidateSignalData {
    type: 'candidate';
    candidate: RTCIceCandidateInit;
}

/** Union of all signaling payload shapes exchanged over the socket connection. */
export type WebRtcSignalPayload = SignalData | IceCandidateSignalData;

export type callEvents = 'state-changed';
export type PeerConnectionEventType = "call-added" | "call-removed";
export const peerConnectionEvents: PeerConnectionEventType[] = [ "call-added", "call-removed" ];

/**
 * RTCRtpSender / RTCRtpReceiver extended with the non-standard
 * `createEncodedStreams()` method (Insertable Streams API).
 */
export interface RTCRtpSenderWithStreams extends RTCRtpSender {
    createEncodedStreams(): { readable: ReadableStream; writable: WritableStream };
}

export interface RTCRtpReceiverWithStreams extends RTCRtpReceiver {
    createEncodedStreams(): { readable: ReadableStream; writable: WritableStream };
}
