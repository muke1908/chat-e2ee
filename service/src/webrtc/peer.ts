import { Logger } from "../utils/logger";
import { generateUUID } from "../utils/uuid";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type OfferSignalData,
    type AnswerSignalData,
    type IceCandidateSignalWithMetadata,
    type SignalMetadata,
    type WebRtcConfig,
    type CallMetrics,
    type IceJourneyEvent,
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

export interface PeerOptions {
    webrtc?: WebRtcConfig;
    onAutoRestartNeeded?: (reason: RTCPeerConnectionState) => void;
}

export class Peer {
    private state: RTCPeerConnectionState;
    private pc: RTCPeerConnection;

    private audioSink: AudioSink;
    private audioStream?: MediaStream;
    private audioSender?: RTCRtpSender;
    private fallbackSignalSeq = 0;
    private fallbackCallId = generateUUID();
    private diagnosticsTimer?: ReturnType<typeof setInterval>;
    private previousStats?: { timestamp: number; bytesSent: number; bytesReceived: number };
    private selectedCandidatePairId?: string;
    private restartTimer?: ReturnType<typeof setTimeout>;
    private audioContext?: AudioContext;
    private audioAnalyser?: AnalyserNode;
    private audioSamples?: Uint8Array<ArrayBuffer>;

    private localStreamAcquisitionPromise?: Promise<void>
    constructor(
        private subCtx: () => Map<callEvents, Set<Function>>,
        private sendSignal: SignalSender,
        private logger: Logger,
        private signalMetadataProvider?: () => SignalMetadata,
        private options: PeerOptions = {},
    ) {
        this.audioSink = new AudioSink(this.logger.createChild('AudioSink'));

        // Media is protected exclusively by WebRTC's mandatory DTLS-SRTP
        // transport encryption; no custom per-frame encryption is layered on
        // top (see the signaling envelope for the E2E-encrypted layer).
        this.pc = new RTCPeerConnection({
            iceServers: this.options.webrtc?.iceServers || DEFAULT_ICE_SERVERS,
            iceTransportPolicy: this.options.webrtc?.iceTransportPolicy,
        });

        this.pc.onconnectionstatechange = () => {
            this.logger.log('Peer Connection State: ', this.pc.connectionState);
            this.state = this.pc.connectionState;
            this.emitIceJourney({
                type: 'connection-state',
                timestamp: Date.now(),
                connectionState: this.pc.connectionState,
                iceConnectionState: this.pc.iceConnectionState,
            });
            const sub = this.subCtx();
            const stateChangeHandler = sub.get('state-changed');
            stateChangeHandler?.forEach(cb => cb(this.state));
            this.maybeAutoRestart(this.pc.connectionState);
        };

        this.pc.oniceconnectionstatechange = () => {
            this.emitIceJourney({
                type: 'ice-connection-state',
                timestamp: Date.now(),
                connectionState: this.pc.connectionState,
                iceConnectionState: this.pc.iceConnectionState,
            });
        };

        this.pc.onicegatheringstatechange = () => {
            this.emitIceJourney({
                type: 'gathering-state',
                timestamp: Date.now(),
                gatheringState: this.pc.iceGatheringState,
            });
        };

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.logger.log('ICE Candidate (Caller) gathered.');
                const candidate = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
                this.emitIceJourney({
                    type: 'local-candidate',
                    timestamp: Date.now(),
                    candidate,
                    ...this.describeCandidate(candidate),
                });
                const metadata = this.resolveSignalMetadata();
                const signal: IceCandidateSignalWithMetadata = {
                    candidate,
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
        this.localStreamAcquisitionPromise = this.addLocalAudioTracks();
        this.startDiagnostics();
    }

    public get callState(): RTCPeerConnectionState {
        return this.state;
    }

    public async createAndSendOffer() {
        await this.localStreamAcquisitionPromise;
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
            await this.localStreamAcquisitionPromise;
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
            this.emitIceJourney({
                type: 'remote-candidate',
                timestamp: Date.now(),
                candidate: data.candidate,
                ...this.describeCandidate(data.candidate),
            });
            const candidate = new RTCIceCandidate(data.candidate);
            this.pc.addIceCandidate(candidate).catch(e => console.error('Error adding ICE candidate:', e));
        }
    }

    public async restartIce(reason = 'manual'): Promise<void> {
        await this.localStreamAcquisitionPromise;
        this.clearRestartTimer();
        this.emitIceJourney({ type: 'ice-restart', timestamp: Date.now(), reason });
        if (typeof this.pc.restartIce === 'function') {
            this.pc.restartIce();
        }
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        const metadata = this.resolveSignalMetadata();
        await this.sendSignal({
            type: 'offer',
            sdp: offer.sdp || '',
            ...metadata,
        });
    }

    public mute(): void {
        this.setMuted(true);
    }

    public unmute(): void {
        this.setMuted(false);
    }

    public setMuted(muted: boolean): void {
        this.audioStream?.getAudioTracks().forEach((track) => {
            track.enabled = !muted;
        });
    }

    public get muted(): boolean {
        const tracks = this.audioStream?.getAudioTracks() || [];
        return tracks.length > 0 && tracks.every((track) => !track.enabled);
    }

    public async switchInputDevice(deviceId: string): Promise<void> {
        const nextStream = await this.getAudioStream(deviceId);
        const nextTrack = nextStream.getAudioTracks()[0];
        if (!nextTrack) {
            nextStream.getTracks().forEach((track) => track.stop());
            throw new Error('Selected input device did not provide an audio track.');
        }
        const oldStream = this.audioStream;
        const oldTrack = oldStream?.getAudioTracks()[0];
        nextTrack.enabled = oldTrack ? oldTrack.enabled : !this.muted;
        if (this.audioSender && typeof this.audioSender.replaceTrack === 'function') {
            await this.audioSender.replaceTrack(nextTrack);
        } else {
            this.audioSender = this.pc.addTrack(nextTrack, nextStream);
        }
        oldStream?.getTracks().forEach((track) => track.stop());
        this.audioStream = nextStream;
        this.setupAudioMeter();
    }

    public async setOutputDevice(deviceId: string): Promise<void> {
        await this.audioSink.setOutputDevice(deviceId);
    }

    public async getStatsSnapshot(): Promise<CallMetrics> {
        const metrics = await this.collectMetrics();
        this.emitCallMetrics(metrics);
        return metrics;
    }

    public dispose(): void {
        this.stopDiagnostics();
        this.clearRestartTimer();
        this.audioContext?.close?.();
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
        const track = this.audioStream.getAudioTracks()[0];
        if (track) {
            this.audioSender = this.pc.addTrack(track, this.audioStream);
        }
        this.setupAudioMeter();
    }

    private async getAudioStream(deviceId?: string): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        const audio: MediaTrackConstraints | boolean = deviceId ? { deviceId: { exact: deviceId } } : true;
        return navigator.mediaDevices.getUserMedia({ audio, video: false });
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

    private startDiagnostics(): void {
        if (!this.options.webrtc?.diagnostics?.enabled) {
            return;
        }
        const intervalMs = Math.max(250, this.options.webrtc.diagnostics.intervalMs || 5000);
        this.diagnosticsTimer = setInterval(() => {
            this.collectMetrics()
                .then((metrics) => this.emitCallMetrics(metrics))
                .catch((error) => this.logger.log('Failed to collect WebRTC stats:', error));
        }, intervalMs);
    }

    private stopDiagnostics(): void {
        if (this.diagnosticsTimer) {
            clearInterval(this.diagnosticsTimer);
            this.diagnosticsTimer = undefined;
        }
    }

    private async collectMetrics(): Promise<CallMetrics> {
        const timestamp = Date.now();
        const report = await this.pc.getStats();
        let bytesSent = 0;
        let bytesReceived = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let jitterMs: number | undefined;
        let rttMs: number | undefined;
        let availableOutgoingBitrateKbps: number | undefined;
        let localAudioLevel = this.getLocalAudioLevel();
        let remoteAudioLevel: number | undefined;
        let selectedCandidatePair: any;
        const statsById = new Map<string, any>();

        report.forEach((stat: any) => statsById.set(stat.id, stat));
        report.forEach((stat: any) => {
            if (stat.type === 'outbound-rtp' && (stat.kind === 'audio' || stat.mediaType === 'audio')) {
                bytesSent += stat.bytesSent || 0;
            }
            if (stat.type === 'inbound-rtp' && (stat.kind === 'audio' || stat.mediaType === 'audio')) {
                bytesReceived += stat.bytesReceived || 0;
                packetsLost += stat.packetsLost || 0;
                packetsReceived += stat.packetsReceived || 0;
                if (typeof stat.jitter === 'number') {
                    jitterMs = stat.jitter * 1000;
                }
                if (typeof stat.audioLevel === 'number') {
                    remoteAudioLevel = stat.audioLevel;
                }
            }
            if ((stat.type === 'media-source' || stat.type === 'track') && typeof stat.audioLevel === 'number') {
                localAudioLevel = stat.audioLevel;
            }
            if (stat.type === 'candidate-pair' && (stat.selected || stat.nominated)) {
                selectedCandidatePair = stat;
            }
            if (stat.type === 'transport' && stat.selectedCandidatePairId) {
                selectedCandidatePair = statsById.get(stat.selectedCandidatePairId) || selectedCandidatePair;
            }
        });

        if (selectedCandidatePair) {
            if (typeof selectedCandidatePair.currentRoundTripTime === 'number') {
                rttMs = selectedCandidatePair.currentRoundTripTime * 1000;
            }
            if (typeof selectedCandidatePair.availableOutgoingBitrate === 'number') {
                availableOutgoingBitrateKbps = selectedCandidatePair.availableOutgoingBitrate / 1000;
            }
            this.emitSelectedPairChange(selectedCandidatePair, statsById);
        }

        const totalBytes = bytesSent + bytesReceived;
        const previous = this.previousStats;
        this.previousStats = { timestamp, bytesSent, bytesReceived };
        const deltaBytes = previous ? (bytesSent - previous.bytesSent) + (bytesReceived - previous.bytesReceived) : 0;
        const bitrateKbps = previous && timestamp > previous.timestamp
            ? (Math.max(0, deltaBytes) * 8) / ((timestamp - previous.timestamp) / 1000) / 1000
            : undefined;
        const packetTotal = packetsLost + packetsReceived;
        const packetLossRatio = packetTotal > 0 ? packetsLost / packetTotal : undefined;
        const localCandidate = selectedCandidatePair ? statsById.get(selectedCandidatePair.localCandidateId) : undefined;
        const remoteCandidate = selectedCandidatePair ? statsById.get(selectedCandidatePair.remoteCandidateId) : undefined;

        return {
            timestamp,
            bitrateKbps,
            availableOutgoingBitrateKbps,
            rttMs,
            packetsLost,
            packetLossRatio,
            jitterMs,
            localAudioLevel,
            remoteAudioLevel,
            selectedCandidatePairId: selectedCandidatePair?.id,
            localCandidateType: localCandidate?.candidateType,
            remoteCandidateType: remoteCandidate?.candidateType,
            localCandidate: localCandidate?.address || localCandidate?.ip,
            remoteCandidate: remoteCandidate?.address || remoteCandidate?.ip,
            iceConnectionState: this.pc.iceConnectionState,
            connectionState: this.pc.connectionState,
        };
    }

    private emitSelectedPairChange(pair: any, statsById: Map<string, any>): void {
        if (!pair.id || pair.id === this.selectedCandidatePairId) {
            return;
        }
        const previousSelectedCandidatePairId = this.selectedCandidatePairId;
        this.selectedCandidatePairId = pair.id;
        const local = statsById.get(pair.localCandidateId);
        const remote = statsById.get(pair.remoteCandidateId);
        this.emitIceJourney({
            type: 'selected-candidate-pair-change',
            timestamp: Date.now(),
            selectedCandidatePairId: pair.id,
            previousSelectedCandidatePairId,
            localCandidateType: local?.candidateType,
            remoteCandidateType: remote?.candidateType,
        });
    }

    private emitCallMetrics(metrics: CallMetrics): void {
        this.subCtx().get('call-metrics')?.forEach((cb) => cb(metrics));
    }

    private emitIceJourney(event: IceJourneyEvent): void {
        this.subCtx().get('ice-journey')?.forEach((cb) => cb(event));
    }

    private maybeAutoRestart(state: RTCPeerConnectionState): void {
        const selfHealing = this.options.webrtc?.selfHealing;
        if (!selfHealing?.enabled) {
            return;
        }
        this.clearRestartTimer();
        if (state === 'failed' && selfHealing.restartOnFailed !== false) {
            this.options.onAutoRestartNeeded?.(state);
        }
        if (state === 'disconnected' && selfHealing.restartOnDisconnected !== false) {
            const delay = Math.max(0, selfHealing.disconnectedRestartDelayMs ?? 2000);
            this.restartTimer = setTimeout(() => this.options.onAutoRestartNeeded?.(state), delay);
        }
    }

    private clearRestartTimer(): void {
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = undefined;
        }
    }

    private describeCandidate(candidate: RTCIceCandidateInit): Partial<IceJourneyEvent> {
        const raw = candidate.candidate || '';
        const parts = raw.split(/\s+/);
        const typIndex = parts.indexOf('typ');
        return {
            candidateType: typIndex >= 0 ? parts[typIndex + 1] : undefined,
            protocol: parts[2],
            address: parts[4],
            port: parts[5] ? Number(parts[5]) : undefined,
        };
    }

    private setupAudioMeter(): void {
        const AudioContextCtor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
        const track = this.audioStream?.getAudioTracks()[0];
        if (!AudioContextCtor || !track) {
            return;
        }
        try {
            this.audioContext?.close?.();
            this.audioContext = new AudioContextCtor();
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 256;
            const source = this.audioContext.createMediaStreamSource(this.audioStream!);
            source.connect(this.audioAnalyser);
            this.audioSamples = new Uint8Array(this.audioAnalyser.fftSize);
        } catch {
            this.audioContext = undefined;
            this.audioAnalyser = undefined;
            this.audioSamples = undefined;
        }
    }

    private getLocalAudioLevel(): number | undefined {
        if (!this.audioAnalyser || !this.audioSamples) {
            return undefined;
        }
        this.audioAnalyser.getByteTimeDomainData(this.audioSamples);
        let sum = 0;
        this.audioSamples.forEach((sample) => {
            const centered = (sample - 128) / 128;
            sum += centered * centered;
        });
        return Math.sqrt(sum / this.audioSamples.length);
    }
}
