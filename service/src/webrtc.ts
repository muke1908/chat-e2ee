import { AesGcmEncryption } from "./cryptoAES";
import { Logger } from "./utils/logger";
import { webrtcSession } from "./webrtcSession";

export interface IE2ECall {
    on(event: callEvents, cb: () => void): void;
    state: RTCPeerConnectionState;
    endCall(): Promise<void>;
}

interface SignalData {
    type: RTCSdpType;
    sdp: string;
}

/** Signal data shape for an ICE candidate (extends the base SignalData union). */
interface IceCandidateSignalData {
    type: 'candidate';
    candidate: RTCIceCandidateInit;
}

/**
 * The non-standard `encodedInsertableStreams` option used when constructing
 * RTCPeerConnection for insertable-streams support.
 */
interface RTCPeerConnectionWithInsertableStreams extends RTCPeerConnection {
    // Non-standard extension – kept as explicit interface rather than `any`
}

/**
 * RTCRtpSender / RTCRtpReceiver extended with the non-standard
 * `createEncodedStreams()` method (Insertable Streams API).
 */
interface RTCRtpSenderWithStreams extends RTCRtpSender {
    createEncodedStreams(): { readable: ReadableStream; writable: WritableStream };
}

interface RTCRtpReceiverWithStreams extends RTCRtpReceiver {
    createEncodedStreams(): { readable: ReadableStream; writable: WritableStream };
}

/**
 * RTCRtpSender/RTCRtpReceiver extended with the standardized
 * `transform` property (RTCRtpScriptTransform / Insertable Streams API).
 */
interface RTCRtpSenderWithTransform extends RTCRtpSender {
    transform: RTCRtpScriptTransform;
}

interface RTCRtpReceiverWithTransform extends RTCRtpReceiver {
    transform: RTCRtpScriptTransform;
}

/**
 * The two encryption methods supported for WebRTC media:
 * - `createEncodedStreams`: older, main-thread stream-piping approach (Chrome/Edge)
 * - `insertableStreams`: standardized RTCRtpScriptTransform worker-based approach
 */
export type EncryptionMethod = 'createEncodedStreams' | 'insertableStreams';

/**
 * Inline worker script for RTCRtpScriptTransform-based encryption/decryption.
 * The worker receives the CryptoKey objects via postMessage and handles the
 * `rtctransform` event to encrypt or decrypt each encoded frame.
 */
const WEBRTC_TRANSFORM_WORKER_SCRIPT = `
let localKey = null;
let remoteKey = null;

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'init') {
        localKey = event.data.localKey;
        remoteKey = event.data.remoteKey;
    }
});

async function processTransform(transformer) {
    const operation = transformer.options.operation;
    const reader = transformer.readable.getReader();
    const writer = transformer.writable.getWriter();
    try {
        while (true) {
            const result = await reader.read();
            if (result.done) break;
            const frame = result.value;
            try {
                if (operation === 'encrypt' && localKey) {
                    const iv = crypto.getRandomValues(new Uint8Array(12));
                    const encrypted = await crypto.subtle.encrypt(
                        { name: 'AES-GCM', iv },
                        localKey,
                        frame.data
                    );
                    const combined = new Uint8Array(12 + encrypted.byteLength);
                    combined.set(iv, 0);
                    combined.set(new Uint8Array(encrypted), 12);
                    frame.data = combined.buffer;
                } else if (operation === 'decrypt' && remoteKey) {
                    const data = new Uint8Array(frame.data);
                    const frameIv = data.slice(0, 12);
                    const encryptedData = data.slice(12);
                    const decrypted = await crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: frameIv },
                        remoteKey,
                        encryptedData
                    );
                    frame.data = decrypted;
                }
                writer.write(frame);
            } catch (err) {
                // Skip frames that cannot be processed (e.g. decryption failure)
            }
        }
    } finally {
        writer.releaseLock();
    }
}

self.addEventListener('rtctransform', function(event) {
    processTransform(event.transformer).catch(function() {});
});
`;

export type callEvents = 'state-changed';
export type PeerConnectionEventType = "call-added" | "call-removed";
export const peerConnectionEvents: PeerConnectionEventType[] = [ "call-added", "call-removed" ];

export class WebRTCCall {
    private peer: Peer | undefined;
    private subs: Map<callEvents, Set<Function>> = new Map()

    /**
     * Returns which encryption methods are supported by the current browser.
     */
    public static getSupportedEncryptionMethods(): { createEncodedStreams: boolean; insertableStreams: boolean } {
        return {
            createEncodedStreams: !!(RTCRtpSender.prototype as RTCRtpSenderWithStreams).createEncodedStreams,
            insertableStreams: typeof RTCRtpScriptTransform !== 'undefined',
        };
    }

    /**
     * Returns true if at least one encryption method is available.
     * Preserved for backwards compatibility.
     */
    public static isSupported(): boolean {
        const methods = WebRTCCall.getSupportedEncryptionMethods();
        return methods.createEncodedStreams || methods.insertableStreams;
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

    constructor(encryption: AesGcmEncryption, sender: string, channel: string, private logger: Logger, private encryptionMethod: EncryptionMethod = 'createEncodedStreams') {
        this.logger.log('Creating WebRTCCall');
        this.peer = new Peer(
            () => this.subs,
            encryption,
            sender,
            channel,
            this.logger.createChild('Peer'),
            this.encryptionMethod
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

    public signal(data: SignalData | IceCandidateSignalData): void {
        this.logger.log('handling signal data');
        if(!this.peer) {
            throw new Error('No peer connection');
        }
        this.peer.signal(data);
    }
}

class Peer {
    private state: RTCPeerConnectionState;
    private pc: RTCPeerConnectionWithInsertableStreams;

    private audioEl?: HTMLAudioElement;
    private audioStream?: MediaStream;

    private localStreamAcquisatonPromise?: Promise<void>

    /** Worker instance used when encryptionMethod === 'insertableStreams' */
    private transformWorker?: Worker;

    constructor(
        private subCtx: () => Map<callEvents, Set<Function>>,
        private encryption: AesGcmEncryption,
        private sender: string,
        private channel: string,
        private logger: Logger,
        private encryptionMethod: EncryptionMethod
    ) {
        const useEncodedInsertableStreams = this.encryptionMethod === 'createEncodedStreams';

        if (this.encryptionMethod === 'insertableStreams') {
            this.transformWorker = this.createTransformWorker();
        }

        // RTCPeerConnection is cast via the interface because `encodedInsertableStreams`
        // is a non-standard constructor option not present in the lib.dom types.
        // It is only needed for the createEncodedStreams path.
        this.pc = new (RTCPeerConnection as unknown as new (config: RTCConfiguration & { encodedInsertableStreams?: boolean }) => RTCPeerConnectionWithInsertableStreams)({
            ...(useEncodedInsertableStreams ? { encodedInsertableStreams: true } : {}),
            iceServers: [
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
            ]
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
                this.applyDecryption('audio', event.receiver);
                this.appendAudioStreamToDom(event.streams[0], 'remote');
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
        // await this.addLocalAudioTracks();
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await webrtcSession({
            description: offer,
            sender: this.sender,
            channelId: this.channel
        });

    }


    public async signal(data: SignalData | IceCandidateSignalData) {
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
        if(this.audioEl) {
            this.audioEl.srcObject = null;
            this.audioEl = undefined;
        }
        if (this.transformWorker) {
            this.transformWorker.terminate();
            this.transformWorker = undefined;
        }
        this.logger.log('Dispose');
        this.pc?.close();
        this.pc = undefined as unknown as RTCPeerConnectionWithInsertableStreams;
    }

    private async addLocalAudioTracks(): Promise<void> {
        this.logger.log('addLocalAudioTracks, adding local track to Peer Connection');
        this.audioStream = await this.getAudioStream();
        this.audioStream.getTracks().forEach(track => this.pc.addTrack(track, this.audioStream!));
        this.applyEncryption('audio');
    }

    /*
    private async addLocalVideoTracks(): Promise<void> {
        this.logger.log('addLocalTracks');
        // const stream = await this.getAudioStream();
        const stream = await this.getVideoStream();
        this.appendVideoStreamToDom(stream, 'local');
        stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
        this.applyEncryption('video');
    }
    */

    private async getAudioStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    private async appendAudioStreamToDom(stream: MediaStream, tag: string): Promise<void> {
        this.logger.log('Adding remote audio track');
        this.audioEl = document.createElement('audio');
        this.audioEl.setAttribute('autoplay', 'true');
        this.audioEl.setAttribute('id', tag);
        this.audioEl.srcObject = stream;

        try {
            await this.audioEl.play();
        }catch(err) {
            this.logger.log(err);
            this.audioEl.setAttribute('controls', 'true');
            setTimeout(() => {
                this.logger.log('Scheduling delay play');
                this.audioEl?.play();
            }, 1000)
        }
        document.body.appendChild(this.audioEl);
    }

    /** Creates the inline Blob worker used for RTCRtpScriptTransform encryption. */
    private createTransformWorker(): Worker {
        const blob = new Blob([WEBRTC_TRANSFORM_WORKER_SCRIPT], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        URL.revokeObjectURL(url);
        return worker;
    }

    /** Sends the AES-GCM keys to the transform worker so it can encrypt/decrypt frames. */
    private initTransformWorkerKeys(): void {
        if (!this.transformWorker) return;
        this.transformWorker.postMessage({
            type: 'init',
            localKey: this.encryption.getLocalAesKey(),
            remoteKey: this.encryption.getRemoteAesKey(),
        });
    }

    private applyDecryption(_mediaType: 'audio' | 'video', receiver: RTCRtpReceiver): void {
        if (this.encryptionMethod === 'insertableStreams') {
            this.applyDecryptionWithInsertableStreams(receiver);
        } else {
            this.applyDecryptionWithEncodedStreams(receiver);
        }
    }

    private applyEncryption(mediaType: 'audio' | 'video'): void {
        if (this.encryptionMethod === 'insertableStreams') {
            this.applyEncryptionWithInsertableStreams(mediaType);
        } else {
            this.applyEncryptionWithEncodedStreams(mediaType);
        }
    }

    // ── createEncodedStreams path ──────────────────────────────────────────────

    private applyDecryptionWithEncodedStreams(receiver: RTCRtpReceiver): void {
        const transformer = new TransformStream({
            transform: async (chunk: RTCEncodedAudioFrame, controller) => {

                try {
                    const data = new Uint8Array(chunk.data);
                    const iv = data.slice(0, 12);  // Assuming 12-byte IV
                    const encryptedData = data.slice(12);

                    const decryptedData = await this.encryption.decryptData(encryptedData, iv);
                    chunk.data = decryptedData;
                    controller.enqueue(chunk);
                } catch (error) {
                    this.logger.log('Decryption error:', error);
                }
            }
        });

        const receiverStreams = (receiver as RTCRtpReceiverWithStreams).createEncodedStreams();
        receiverStreams.readable
            .pipeThrough(transformer)
            .pipeTo(receiverStreams.writable);
    }

    private applyEncryptionWithEncodedStreams(mediaType: 'audio' | 'video'): void {
        const sender = this.pc.getSenders().find(r => r.track?.kind === mediaType);

        const transformer = new TransformStream({
            transform: async (chunk: RTCEncodedAudioFrame, controller) => {
                try {
                    const { encryptedData, iv } = await this.encryption.encryptData(chunk.data);

                    const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
                    combinedData.set(iv, 0);
                    combinedData.set(encryptedData, iv.length);

                    chunk.data = combinedData.buffer;
                    controller.enqueue(chunk);
                } catch (error) {
                    this.logger.log('Encryption error:', error);
                }
            }
        });

        const senderStreams = (sender as RTCRtpSenderWithStreams).createEncodedStreams();
        senderStreams.readable
            .pipeThrough(transformer)
            .pipeTo(senderStreams.writable);
    }

    // ── RTCRtpScriptTransform / Insertable Streams path ───────────────────────

    private applyDecryptionWithInsertableStreams(receiver: RTCRtpReceiver): void {
        this.initTransformWorkerKeys();
        (receiver as RTCRtpReceiverWithTransform).transform = new RTCRtpScriptTransform(
            this.transformWorker!,
            { operation: 'decrypt' }
        );
    }

    private applyEncryptionWithInsertableStreams(mediaType: 'audio' | 'video'): void {
        const sender = this.pc.getSenders().find(r => r.track?.kind === mediaType);
        if (!sender) return;
        this.initTransformWorkerKeys();
        (sender as RTCRtpSenderWithTransform).transform = new RTCRtpScriptTransform(
            this.transformWorker!,
            { operation: 'encrypt' }
        );
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
