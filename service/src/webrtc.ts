import { SocketListenerType } from "./sdk";
import { Logger } from "./utils/logger";
import { webrtcSession } from "./webrtcSession";

interface SignalData {
    type: RTCSdpType;
    sdp: string;
}

export class WebRTCCall {
    private peer: Peer;
    private stream: MediaStream;

    constructor(private sender: string, private channel: string, subscriptions: Map<SocketListenerType, Set<Function>>, private logger: Logger) {
        this.logger.log('Creating WebRTCCall');
        this.peer = new Peer(sender, channel, this.logger);
    }

    async startCall(): Promise<void> {
        this.logger.log('startCall');
        return this.peer.createAndSendOffer();
    }

    public endCall(): void {
        this.logger.log('endCall');
        this.stream?.getTracks().forEach(track => track.stop());
        this.peer?.dispose();
    }

    public signal(data): void {
        this.logger.log('handling signal data');
        if(!this.peer) {
            throw new Error('No peer connection');
        }
        this.peer.signal(data);
    }
}

class Peer {
    private pc: RTCPeerConnection;
    private onSignalCallback: ((signal: SignalData) => void) | null = null;
    private onStreamCallback: ((stream: MediaStream) => void) | null = null;
    private logger?: Logger;
    constructor(private sender: string, private channel: string, logger: Logger) {
        this.logger = logger.createChild('Peer');
        this.pc = new RTCPeerConnection({
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

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.logger.log('ICE Candidate (Caller) gathered');
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
            this.logger.log('Adding remote audio track');
            const adioEl = document.createElement('audio')
            document.body.appendChild(adioEl);
            adioEl.setAttribute('controls', 'true');
            adioEl.setAttribute('autoplay', 'true');
            adioEl.srcObject = event.streams[0];
        };
    }

    public async createAndSendOffer() {
        this.logger.log('createAndSendOffer');
        await this.addLocalTracks();
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
            this.logger.log('Signal, offer');
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
            await this.addLocalTracks();
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
        this.logger.log('Dispose');
        this.pc.close();
    }

    private async addLocalTracks(): Promise<void> {
        this.logger.log('addLocalTracks');
        const stream = await this.getAudioStream();
        stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
    }

    private async getAudioStream(): Promise<MediaStream> {
        this.logger.log('getAudioStream');
        return navigator.mediaDevices.getUserMedia({ audio: true });
    }
}