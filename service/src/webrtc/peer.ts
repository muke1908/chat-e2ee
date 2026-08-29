import { Logger } from "../utils/logger";
import { generateUUID } from "../utils/uuid";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type OfferSignalData,
    type AnswerSignalData,
    type IceCandidateSignalWithMetadata,
    type SignalMetadata,
} from "./types";
import { AudioSink } from "./audioSink";

/** Public STUN servers used for ICE candidate gathering. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:5349" },
    { urls: "stun:stun3.l.google.com:3478" },
    { urls: "stun:stun3.l.google.com:5349" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:5349" }
];

/**
 * Seals and sends a signaling payload (offer/answer/ICE candidate/call
 * control) over the socket connection. Provided by the SDK facade so `Peer`
 * never needs to know about encryption keys or the room id — it only knows
 * how to hand a payload off.
 */
export type SignalSender = (signal: WebRtcSignalPayload) => Promise<void>;

export class Peer {
    private state: RTCPeerConnectionState;
    private pc: RTCPeerConnection;

    private audioSink: AudioSink;
    private audioStream?: MediaStream;
    private fallbackSignalSeq = 0;
    private fallbackCallId = generateUUID();

    private localStreamAcquisatonPromise?: Promise<void>
    constructor(
        private subCtx: () => Map<callEvents, Set<Function>>,
        private sendSignal: SignalSender,
        private logger: Logger,
        private signalMetadataProvider?: () => SignalMetadata,
    ) {
        this.audioSink = new AudioSink(this.logger.createChild('AudioSink'));

        // Media is protected exclusively by WebRTC's mandatory DTLS-SRTP
        // transport encryption; no custom per-frame encryption is layered on
        // top (see the signaling envelope for the E2E-encrypted layer).
        this.pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });

        this.pc.onconnectionstatechange = () => {
            this.logger.log('Peer Connection State: ', this.pc.connectionState);
            this.state = this.pc.connectionState;
            const sub = this.subCtx();
            const stateChangeHanlder = sub.get('state-changed');
            stateChangeHanlder?.forEach(cb => cb(this.state));
        };

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.logger.log('ICE Candidate (Caller) gathered.');
                const metadata = this.resolveSignalMetadata();
                const signal: IceCandidateSignalWithMetadata = {
                    candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
                    type: 'candidate',
                    ...metadata,
                };
                this.sendSignal(signal).catch((error) => this.logger.log('Failed to send ICE candidate:', error));
            }
        };

        this.pc.ontrack = (event: RTCTrackEvent) => {
            event.streams[0].getAudioTracks().forEach(() => {
                this.logger.log('Adding remote audio track');
                this.audioSink.attach(event.streams[0], 'remote');
            })
        };

        this.state = this.pc.connectionState;
        this.localStreamAcquisatonPromise = this.addLocalAudioTracks();
    }

    public get callState(): RTCPeerConnectionState {
        return this.state;
    }

    public async createAndSendOffer() {
        await this.localStreamAcquisatonPromise;
        this.logger.log('createAndSendOffer');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        const metadata = this.resolveSignalMetadata();
        const signal: OfferSignalData = {
            type: 'offer',
            sdp: offer.sdp || '',
            ...metadata,
        };
        await this.sendSignal(signal);
    }


    public async signal(data: WebRtcSignalPayload) {
        if (data.type === 'offer') {
            await this.localStreamAcquisatonPromise;
            this.logger.log('Signal, offer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            const metadata = this.resolveSignalMetadata();
            const signal: AnswerSignalData = {
                type: 'answer',
                sdp: answer.sdp || '',
                ...metadata,
            };
            await this.sendSignal(signal);
        } else if (data.type === 'answer') {
            this.logger.log('Signal, answer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'candidate') {
            this.logger.log('Signal, candidate');
            const candidate = new RTCIceCandidate(data.candidate);
            this.pc.addIceCandidate(candidate).catch(e => console.error('Error adding ICE candidate:', e));
        }
    }

    public dispose(): void {
        if(this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop() ;
            });
            this.audioStream = undefined;
        }
        this.audioSink.detach();
        this.logger.log('Dispose');
        this.pc?.close();
        this.pc = undefined as unknown as RTCPeerConnection;
    }

    private async addLocalAudioTracks(): Promise<void> {
        this.logger.log('addLocalAudioTracks, adding local track to Peer Connection');
        this.audioStream = await this.getAudioStream();
        this.audioStream.getTracks().forEach(track => this.pc.addTrack(track, this.audioStream!));
    }

    private async getAudioStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    private resolveSignalMetadata(): SignalMetadata {
        if (this.signalMetadataProvider) {
            return this.signalMetadataProvider();
        }
        return {
            callId: this.fallbackCallId,
            seq: ++this.fallbackSignalSeq,
            timestamp: Date.now(),
        };
    }
}
