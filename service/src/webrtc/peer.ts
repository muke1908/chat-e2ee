import { type ISymmetricEncryption } from "../crypto/cryptoAES";
import { Logger } from "../utils/logger";
import { webrtcSession } from "../api/webrtcSession";
import {
    type callEvents,
    type WebRtcSignalPayload,
    type SignalData,
    type IceCandidateSignalData,
} from "./types";
import { FrameCodec } from "./frameCodec";
import { AudioSink } from "./audioSink";
import { applyEncodedTransform } from './encodedTransform';

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

export class Peer {
    private state: RTCPeerConnectionState;
    private pc: RTCPeerConnection;

    private audioSink: AudioSink;
    private frameCodec: FrameCodec;
    private audioStream?: MediaStream;
    private encodedTransformCleanup: Array<() => void> = [];

    private localStreamAcquisatonPromise?: Promise<void>
    constructor(
        private subCtx: () => Map<callEvents, Set<Function>>,
        private encryption: ISymmetricEncryption,
        private sender: string,
        private channel: string,
        private logger: Logger
    ) {
        this.audioSink = new AudioSink(this.logger.createChild('AudioSink'));
        this.frameCodec = new FrameCodec(this.encryption, this.logger.createChild('FrameCodec'));

        // The constructor is cast because `encodedInsertableStreams`
        // is a non-standard constructor option not present in the lib.dom types.
        this.pc = new (RTCPeerConnection as unknown as new (config: RTCConfiguration & { encodedInsertableStreams: boolean }) => RTCPeerConnection)({
            encodedInsertableStreams: true,
            iceServers: DEFAULT_ICE_SERVERS
        });

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
                webrtcSession({
                    description: {
                        candidate: event.candidate,
                        type: 'candidate'
                    },
                    sender: this.sender,
                    channelId: this.channel
                });
            }
        };

        this.pc.ontrack = (event: RTCTrackEvent) => {
            event.streams[0].getAudioTracks().forEach(() => {
                this.logger.log('Adding remote audio track');
                this.applyDecryption(event.receiver);
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
        await webrtcSession({
            description: offer,
            sender: this.sender,
            channelId: this.channel
        });

    }


    public async signal(data: WebRtcSignalPayload) {
        if (data.type === 'offer') {
            await this.localStreamAcquisatonPromise;
            this.logger.log('Signal, offer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data as SignalData));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await webrtcSession({
                description: answer,
                sender: this.sender,
                channelId: this.channel
            });
        } else if (data.type === 'answer') {
            this.logger.log('Signal, answer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data as SignalData));
        } else if (data.type === 'candidate') {
            this.logger.log('Signal, candidate');
            const iceCandidateData = data as IceCandidateSignalData;
            const candidate = new RTCIceCandidate(iceCandidateData.candidate);
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
        this.encodedTransformCleanup.forEach(cleanup => cleanup());
        this.encodedTransformCleanup = [];
        this.logger.log('Dispose');
        this.pc?.close();
        this.pc = undefined as unknown as RTCPeerConnection;
    }

    private async addLocalAudioTracks(): Promise<void> {
        this.logger.log('addLocalAudioTracks, adding local track to Peer Connection');
        this.audioStream = await this.getAudioStream();
        this.audioStream.getTracks().forEach(track => this.pc.addTrack(track, this.audioStream!));
        this.applyEncryption('audio');
    }

    private async getAudioStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    private applyDecryption(receiver: RTCRtpReceiver): void {
        try {
            this.encodedTransformCleanup.push(
                applyEncodedTransform(receiver, 'decrypt', this.encryption, this.frameCodec, this.logger),
            );
        } catch (error) {
            this.logger.log('Unable to initialize incoming encoded-frame decryption:', error);
        }
    }

    private applyEncryption(mediaType: 'audio' | 'video'): void {
        const sender = this.pc.getSenders().find(r => r.track?.kind === mediaType);

        if (!sender) {
            throw new Error(`No ${mediaType} sender is available for encoded-frame encryption.`);
        }
        this.encodedTransformCleanup.push(
            applyEncodedTransform(sender, 'encrypt', this.encryption, this.frameCodec, this.logger),
        );
    }
}
