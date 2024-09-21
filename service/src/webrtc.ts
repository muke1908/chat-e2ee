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
export type callEvents = 'state-changed';
export type PeerConnectionEventType = "call-added" | "call-removed";
export const peerConnectionEvents: PeerConnectionEventType[] = [ "call-added", "call-removed" ];

export class WebRTCCall { 
    private peer: Peer;
    private subs: Map<callEvents, Set<Function>> = new Map()

    public static isSupported(): boolean {
        return  !!(RTCRtpSender.prototype as any).createEncodedStreams;
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

    constructor(encryption: AesGcmEncryption, sender: string, channel: string, private logger: Logger) {
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
        return this.peer.callState;
    }

    async startCall(): Promise<void> {
        this.logger.log('startCall');
        return this.peer.createAndSendOffer();
    }

    public endCall(): void {
        this.logger.log('endCall');
        this.subs.clear();
        this.peer?.dispose();
        this.peer = null;
    }

    public signal(data: SignalData): void {
        this.logger.log('handling signal data');
        if(!this.peer) {
            throw new Error('No peer connection');
        }
        this.peer.signal(data);
    }
}

class Peer {
    private state: RTCPeerConnectionState;
    private pc: RTCPeerConnection;

    private audioEl?: HTMLAudioElement;
    private audioStream?: MediaStream;

    private localStreamAcquisatonPromise?: Promise<void>
    constructor(
        private subCtx: () => Map<callEvents, Set<Function>>,
        private encryption: AesGcmEncryption, 
        private sender: string, 
        private channel: string, 
        private logger: Logger
    ) {
        this.pc = new (RTCPeerConnection as any)({
            encodedInsertableStreams: true,
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

        this.pc.onicecandidate = (event) => {
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

        this.pc.ontrack = (event) => {
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


    public async signal(data: SignalData) {
        if (data.type === 'offer') {
            await this.localStreamAcquisatonPromise;
            this.logger.log('Signal, offer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await webrtcSession({ 
                description: answer,
                sender: this.sender,
                channelId: this.channel
            });
        } else if (data.type === 'answer') {
            this.logger.log('Signal, answer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if ((data as any).type === 'candidate') {
            this.logger.log('Signal, candidate');
            const candidate = new RTCIceCandidate((data as any).candidate);
            this.pc.addIceCandidate(candidate).catch(e => console.error('Error adding ICE candidate:', e));
        }
    }

    public dispose(): void {
        if(this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop() ;
            });
            this.audioStream = null;
        }
        if(this.audioEl) {
            this.audioEl.srcObject = null;
            this.audioEl = null;
        }
        this.logger.log('Dispose');
        this.pc?.close();
        this.pc = null;
    }

    private async addLocalAudioTracks(): Promise<void> {
        this.logger.log('addLocalAudioTracks, adding local track to Peer Connection');
        this.audioStream = await this.getAudioStream();
        this.audioStream.getTracks().forEach(track => this.pc.addTrack(track, this.audioStream));
        this.applyEncryption('audio');
    }

    /*
    private async addLocalVideoTracks(): Promise<void> {
        this.logger.log('addLocalTracks');
        // const stream = await this.getAudioStream();
        const stream = await this.getVideoStream();
        this.appenVideoStreamToDom(stream, 'local');
        stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
        this.applyEncryption('video');
    }
    */

    private async getAudioStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    private async getVideoStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
                this.audioEl.play();
            }, 1000)
        }
        document.body.appendChild(this.audioEl);
    }

    private appenVideoStreamToDom(stream: MediaStream, tag: string): void {
        this.logger.log('Adding remote video track');
        const videoEl = document.createElement('video');
        document.body.appendChild(videoEl);
        videoEl.setAttribute('controls', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.setAttribute('id', tag);
        videoEl.srcObject = stream
    }

    private applyDecryption(mediaType: 'audio' | 'video', receiver: RTCRtpReceiver): void {
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

        const receiverStreams =  (receiver as any).createEncodedStreams();
        receiverStreams.readable
            .pipeThrough(transformer)
            .pipeTo(receiverStreams.writable);
    }

    private applyEncryption( mediaType: 'audio' | 'video'): void {
        const sender = this.pc.getSenders().find(r => r.track.kind === mediaType);

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

        const senderStreams = (sender as any).createEncodedStreams();
        senderStreams.readable
            .pipeThrough(transformer)
            .pipeTo(senderStreams.writable);
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