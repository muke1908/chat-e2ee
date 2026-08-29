export interface SignalData {
    type: RTCSdpType;
    sdp: string;
}

/** Signal data shape for an ICE candidate (extends the base SignalData union). */
export interface IceCandidateSignalData {
    type: 'candidate';
    candidate: RTCIceCandidateInit;
}

export type CallControlSignalType =
    | 'call-invite'
    | 'call-accept'
    | 'call-reject'
    | 'call-cancel'
    | 'call-end'
    | 'call-timeout';

export type CallEndReason =
    | 'local-end'
    | 'remote-end'
    | 'rejected'
    | 'cancelled'
    | 'timeout'
    | 'failed';

export type CallLifecycleState =
    | 'idle'
    | 'initiating'
    | 'ringing'
    | 'incoming'
    | 'connecting'
    | 'connected'
    | 'ending'
    | 'ended'
    | 'rejected'
    | 'no-peer'
    | 'media-denied'
    | 'signaling-failed'
    | 'ice-failed'
    | 'timeout'
    | 'cancelled';

export interface SignalMetadata {
    callId: string;
    seq: number;
    timestamp: number;
}

export interface OfferSignalData extends SignalData, SignalMetadata {
    type: 'offer';
}

export interface AnswerSignalData extends SignalData, SignalMetadata {
    type: 'answer';
}

export interface IceCandidateSignalWithMetadata extends IceCandidateSignalData, SignalMetadata {
    type: 'candidate';
}

export interface CallControlSignal extends SignalMetadata {
    type: CallControlSignalType;
    reason?: CallEndReason;
}

export interface CallLifecycleUpdate {
    state: CallLifecycleState;
    reason?: CallEndReason;
    callId?: string;
}

/** Union of all signaling payload shapes exchanged over the socket connection. */
export type WebRtcSignalPayload =
    | OfferSignalData
    | AnswerSignalData
    | IceCandidateSignalWithMetadata
    | CallControlSignal;

export type callEvents = 'state-changed';
export type PeerConnectionEventType =
    | "call-added"
    | "call-removed"
    | "call-invite"
    | "call-state-changed"
    | "call-rejected"
    | "call-cancelled"
    | "call-ended"
    | "call-timeout";
export const peerConnectionEvents: PeerConnectionEventType[] = [
    "call-added",
    "call-removed",
    "call-invite",
    "call-state-changed",
    "call-rejected",
    "call-cancelled",
    "call-ended",
    "call-timeout",
];
