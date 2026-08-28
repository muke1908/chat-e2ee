import { type ISymmetricEncryption } from "../crypto/cryptoAES";
import { Logger } from "../utils/logger";
import { Peer } from "./peer";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type IceCandidateSignalData,
    type PeerConnectionEventType,
    type RTCRtpSenderWithStreams,
    peerConnectionEvents,
} from "./types";

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
        return  !!(RTCRtpSender.prototype as RTCRtpSenderWithStreams).createEncodedStreams;
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

    constructor(encryption: ISymmetricEncryption, sender: string, channel: string, private logger: Logger) {
        this.logger.log('Creating WebRTCCall');
        this.peer = new Peer(
            () => this.subs,
            encryption,
            sender,
            channel,
            this.logger.createChild('Peer')
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
    private bufferedIceCandidates: IceCandidateSignalData[] = [];

    constructor(
        private createCall: () => WebRTCCall,
        private onCallCreated: (call: WebRTCCall) => void,
        private logger: Logger,
    ) {}

    public get activeCall(): WebRTCCall | undefined {
        return this.call;
    }

    /** Register a call created outside of signal routing (e.g. an outgoing call). */
    public attachCall(call: WebRTCCall): void {
        this.call = call;
    }

    public handleSignal(data: WebRtcSignalPayload): void {
        this.logger.log(`New session description: ${data.type}`);
        if (data.type === 'offer') {
            this.call = this.createCall();
            this.onCallCreated(this.call);
            this.call.signal(data);
            this.flushBufferedIceCandidates();
        } else if (data.type === 'answer') {
            this.call?.signal(data);
        } else if (data.type === 'candidate') {
            if (!this.call) {
                this.logger.log('Call not created yet, buffering ICE candidate.');
                this.bufferedIceCandidates.push(data);
            } else {
                this.call.signal(data);
            }
        }
    }

    /** Clear the active call reference and any buffered ICE candidates. */
    public reset(): void {
        this.call = undefined;
        this.bufferedIceCandidates = [];
    }

    private flushBufferedIceCandidates(): void {
        this.bufferedIceCandidates.forEach((ice) => this.call!.signal(ice));
        this.bufferedIceCandidates = [];
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
