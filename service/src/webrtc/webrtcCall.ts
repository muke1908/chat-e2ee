import { type ISymmetricEncryption } from "../crypto/cryptoAES";
import { Logger } from "../utils/logger";
import { Peer } from "./peer";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type IceCandidateSignalWithMetadata,
    type OfferSignalData,
    type SignalMetadata,
    type PeerConnectionEventType,
    peerConnectionEvents,
} from "./types";
import { supportsEncodedTransforms } from './encodedTransform';

export type { WebRtcSignalPayload, callEvents, PeerConnectionEventType };
export { peerConnectionEvents };

export interface IE2ECall {
    on(event: callEvents, cb: () => void): void;
    state: RTCPeerConnectionState;
    endCall(): Promise<void>;
}

export class WebRTCCall {
    private peer: Peer | undefined;
    private subs: Map<callEvents, Set<Function>> = new Map()

    public static isSupported(): boolean {
        return supportsEncodedTransforms();
    }

    public on(listener: callEvents, cb: (state: RTCPeerConnectionState) => void): void {
        const sub = this.subs.get(listener);
        if (sub) {
            if (sub.has(cb)) {
                return;
            }
            sub.add(cb);
        } else {
            this.subs.set(listener, new Set([cb]));
        }
    }

    constructor(
        encryption: ISymmetricEncryption,
        sender: string,
        channel: string,
        private logger: Logger,
        private signalMetadataProvider?: () => SignalMetadata,
    ) {
        this.logger.log('Creating WebRTCCall');
        this.peer = new Peer(
            () => this.subs,
            encryption,
            sender,
            channel,
            this.logger.createChild('Peer'),
            this.signalMetadataProvider,
        );
    }

    public get callState(): RTCPeerConnectionState {
        return this.peer!.callState;
    }

    async startCall(): Promise<void> {
        this.logger.log('startCall');
        return this.peer!.createAndSendOffer();
    }

    public endCall(): void {
        this.logger.log('endCall');
        this.subs.clear();
        this.peer?.dispose();
        this.peer = undefined;
    }

    public signal(data: WebRtcSignalPayload): void {
        this.logger.log('handling signal data');
        if(!this.peer) {
            throw new Error('No peer connection');
        }
        this.peer.signal(data);
    }
}

/**
 * Routes incoming WebRTC signaling messages (offer / answer / ICE candidate) to
 * the active call.
 *
 * - An 'offer' creates a new call (via the injected factory) and flushes any
 *   ICE candidates that arrived before the call existed.
 * - 'answer' / 'candidate' are forwarded to the active call if one exists,
 *   otherwise candidates are buffered until a call is created or attached.
 *
 * This consolidates signal-routing logic that previously lived in the SDK
 * façade (sdk.ts) alongside the offer/answer/candidate handling in Peer.
 */
export class CallSignalRouter {
    private call?: WebRTCCall;
    private activeCallId?: string;
    private pendingIncomingOffer?: OfferSignalData;
    private acceptedPendingCallId?: string;
    private bufferedIceCandidates: IceCandidateSignalWithMetadata[] = [];
    private lastSeqByCall: Map<string, number> = new Map();

    constructor(
        private createCall: () => WebRTCCall,
        private onCallCreated: (call: WebRTCCall) => void,
        private onIncomingOffer: (callId: string) => void,
        private logger: Logger,
    ) {}

    public get activeCall(): WebRTCCall | undefined {
        return this.call;
    }

    public get pendingCallId(): string | undefined {
        return this.pendingIncomingOffer?.callId;
    }

    /** Register a call created outside of signal routing (e.g. an outgoing call). */
    public attachCall(call: WebRTCCall, callId: string): void {
        this.call = call;
        this.activeCallId = callId;
        this.flushBufferedIceCandidates(callId);
    }

    public handleSignal(data: WebRtcSignalPayload): void {
        this.logger.log(`New session description: ${data.type}`);
        if (this.isStale(data)) {
            this.logger.log(`Ignoring stale signal: ${data.type}, ${data.callId}, seq=${data.seq}`);
            return;
        }
        if (this.isControlSignal(data.type)) {
            return;
        }

        if (data.type === 'offer') {
            if (this.call && this.activeCallId === data.callId) {
                this.call.signal(data);
                return;
            }
            if (this.acceptedPendingCallId === data.callId) {
                this.pendingIncomingOffer = data;
                this.acceptPendingOffer(data.callId);
                return;
            }
            this.pendingIncomingOffer = data;
            this.onIncomingOffer(data.callId);
        } else if (data.type === 'answer') {
            if (this.call && this.activeCallId === data.callId) {
                this.call.signal(data);
            }
        } else if (data.type === 'candidate') {
            if (!this.call || this.activeCallId !== data.callId) {
                this.logger.log('Call not created yet, buffering ICE candidate.');
                this.bufferedIceCandidates.push(data);
            } else {
                this.call.signal(data);
            }
        }
    }

    public acceptPendingOffer(callId: string): WebRTCCall | undefined {
        this.acceptedPendingCallId = callId;
        if (!this.pendingIncomingOffer || this.pendingIncomingOffer.callId !== callId) {
            return undefined;
        }
        const call = this.createCall();
        this.call = call;
        this.activeCallId = this.pendingIncomingOffer.callId;
        this.acceptedPendingCallId = undefined;
        this.onCallCreated(call);
        call.signal(this.pendingIncomingOffer);
        this.pendingIncomingOffer = undefined;
        this.flushBufferedIceCandidates(this.activeCallId);
        return call;
    }

    public rejectPendingOffer(): string | undefined {
        const pendingId = this.pendingIncomingOffer?.callId || this.acceptedPendingCallId;
        this.acceptedPendingCallId = undefined;
        this.pendingIncomingOffer = undefined;
        if (pendingId) {
            this.bufferedIceCandidates = this.bufferedIceCandidates.filter((c) => c.callId !== pendingId);
        }
        return pendingId;
    }

    /** Clear the active call reference and any buffered ICE candidates. */
    public reset(): void {
        this.call = undefined;
        this.activeCallId = undefined;
        this.pendingIncomingOffer = undefined;
        this.acceptedPendingCallId = undefined;
        this.bufferedIceCandidates = [];
        this.lastSeqByCall.clear();
    }

    private flushBufferedIceCandidates(callId: string): void {
        const scoped = this.bufferedIceCandidates.filter((ice) => ice.callId === callId);
        const others = this.bufferedIceCandidates.filter((ice) => ice.callId !== callId);
        scoped.forEach((ice) => this.call!.signal(ice));
        this.bufferedIceCandidates = others;
    }

    private isControlSignal(type: WebRtcSignalPayload['type']): boolean {
        return type.startsWith('call-');
    }

    private isStale(data: WebRtcSignalPayload): boolean {
        const last = this.lastSeqByCall.get(data.callId);
        if (typeof last === 'number' && data.seq <= last) {
            return true;
        }
        this.lastSeqByCall.set(data.callId, data.seq);
        return false;
    }
}

// Public facing class
export class E2ECall implements IE2ECall {
    constructor(private readonly webRtcCall: WebRTCCall) {}
    public on(event: callEvents, cb: () => void): void {
        this.webRtcCall.on(event, cb);
    }
    public get state(): RTCPeerConnectionState {
        return this.webRtcCall.callState;
    }
    public async endCall(): Promise<void> {
        return this.webRtcCall.endCall();
    }
}
