import { Logger } from "../utils/logger";
import { generateUUID } from "../utils/uuid";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type OfferSignalData,
    type AnswerSignalData,
    type IceCandidateSignalWithMetadata,
    type SignalMetadata,
    type CallStatsSnapshot,
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
    private audioContext?: AudioContext;
    private localAudioSource?: MediaStreamAudioSourceNode;
    private localAudioAnalyser?: AnalyserNode;
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

    public get muted(): boolean {
        return !(this.audioStream?.getAudioTracks()[0]?.enabled ?? true);
    }

    public mute(): void {
        this.setMuted(true);
    }

    public unmute(): void {
        this.setMuted(false);
    }

    public setMuted(mute: boolean): void {
        const audioTrack = this.audioStream?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !mute;
        }
    }

    public setOutputDevice(deviceId: string): Promise<void> {
        return this.audioSink.setOutputDevice(deviceId);
    }

    public async getStatsSnapshot(): Promise<CallStatsSnapshot> {
        await this.localStreamAcquisatonPromise;
        this.initializeLocalAudioMeter();

        const snapshot: CallStatsSnapshot = {};
        if (this.localAudioAnalyser) {
            const samples = new Uint8Array(this.localAudioAnalyser.fftSize);
            this.localAudioAnalyser.getByteTimeDomainData(samples);
            let sumOfSquares = 0;
            for (const sample of samples) {
                const normalizedSample = (sample - 128) / 128;
                sumOfSquares += normalizedSample * normalizedSample;
            }
            snapshot.localAudioLevel = Math.sqrt(sumOfSquares / samples.length);
        }

        const remoteAudioLevel = await this.getRemoteAudioLevel();
        if (typeof remoteAudioLevel === 'number') {
            snapshot.remoteAudioLevel = remoteAudioLevel;
        }
        return snapshot;
    }

    public async switchInputDevice(deviceId: string): Promise<void> {
        await this.localStreamAcquisatonPromise;

        const oldAudioTrack = this.audioStream?.getAudioTracks()[0];
        if (!oldAudioTrack) {
            throw new Error('No local audio track is available to replace.');
        }

        const newStream = await this.getAudioStream(deviceId);
        const newAudioTrack = newStream.getAudioTracks()[0];
        if (!newAudioTrack) {
            newStream.getTracks().forEach(track => track.stop());
            throw new Error('The selected input device did not provide an audio track.');
        }

        const audioSender = this.pc.getSenders().find(sender => sender.track?.kind === 'audio');
        if (!audioSender) {
            newStream.getTracks().forEach(track => track.stop());
            throw new Error('No local audio sender is available to replace.');
        }

        newAudioTrack.enabled = oldAudioTrack.enabled;
        try {
            await audioSender.replaceTrack(newAudioTrack);
        } catch (error) {
            newStream.getTracks().forEach(track => track.stop());
            this.logger.log('Failed to switch input device:', error);
            throw error;
        }

        oldAudioTrack.stop();
        this.audioStream = newStream;
        this.closeLocalAudioMeter();
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
        if (!this.pc) {
            return;
        }
        if(this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop() ;
            });
            this.audioStream = undefined;
        }
        this.closeLocalAudioMeter();
        this.pc.onconnectionstatechange = null;
        this.pc.onicecandidate = null;
        this.pc.ontrack = null;
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

    private initializeLocalAudioMeter(): void {
        if (this.localAudioAnalyser || !this.audioStream) {
            return;
        }

        // AudioContext is unavailable in some browsers and may be blocked by
        // autoplay or permission policies, so metering must never break calls.
        const audioContextConstructor = (globalThis as typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
        }).AudioContext ?? (globalThis as typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
        if (!audioContextConstructor) {
            return;
        }

        try {
            this.audioContext = new audioContextConstructor();
            this.localAudioSource = this.audioContext.createMediaStreamSource(this.audioStream);
            this.localAudioAnalyser = this.audioContext.createAnalyser();
            this.localAudioAnalyser.fftSize = 256;
            this.localAudioSource.connect(this.localAudioAnalyser);
        } catch (error) {
            this.logger.log('Local audio metering is unavailable:', error);
            this.closeLocalAudioMeter();
        }
    }

    private closeLocalAudioMeter(): void {
        this.localAudioSource?.disconnect();
        this.localAudioSource = undefined;
        this.localAudioAnalyser = undefined;

        const audioContext = this.audioContext;
        this.audioContext = undefined;
        if (audioContext) {
            Promise.resolve(audioContext.close()).catch(error => {
                this.logger.log('Failed to close local audio meter:', error);
            });
        }
    }

    private async getRemoteAudioLevel(): Promise<number | undefined> {
        if (typeof this.pc?.getStats !== 'function') {
            return undefined;
        }

        try {
            const stats = await this.pc.getStats();
            let remoteAudioLevel: number | undefined;
            stats.forEach(report => {
                if (report.type !== 'inbound-rtp') {
                    return;
                }
                const inboundAudioReport = report as RTCInboundRtpStreamStats & {
                    audioLevel?: number;
                    kind?: string;
                    mediaType?: string;
                };
                if (
                    (inboundAudioReport.kind === 'audio' || inboundAudioReport.mediaType === 'audio') &&
                    typeof inboundAudioReport.audioLevel === 'number'
                ) {
                    remoteAudioLevel = inboundAudioReport.audioLevel;
                }
            });
            return remoteAudioLevel;
        } catch (error) {
            this.logger.log('Remote audio metering is unavailable:', error);
            return undefined;
        }
    }

    private async getAudioStream(deviceId?: string): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
            video: false,
        });
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
