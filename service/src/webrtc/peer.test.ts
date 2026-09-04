import { Logger } from '../utils/logger';
import type { callEvents, WebRtcSignalPayload } from './types';

// ---------------------------------------------------------------------------
// Mocks for the WebRTC/DOM globals + collaborator modules Peer depends on.
// ---------------------------------------------------------------------------
const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDetach = jest.fn();
const mockSetOutputDevice = jest.fn().mockResolvedValue(undefined);
jest.mock('./audioSink', () => ({
    AudioSink: jest.fn().mockImplementation(() => ({
        attach: mockAttach,
        detach: mockDetach,
        setOutputDevice: mockSetOutputDevice,
    })),
}));

import { Peer, type PeerOptions } from './peer';

interface FakeTrack {
    kind: string;
    enabled: boolean;
    stop: jest.Mock;
}

function makeFakeTrack(kind = 'audio'): FakeTrack {
    return { kind, enabled: true, stop: jest.fn() };
}

function makeFakeStream(tracks: FakeTrack[]) {
    return {
        getTracks: () => tracks,
        getAudioTracks: () => tracks.filter(t => t.kind === 'audio'),
    };
}

class FakeRTCPeerConnection {
    public connectionState: RTCPeerConnectionState = 'new';
    public onconnectionstatechange: (() => void) | null = null;
    public oniceconnectionstatechange: (() => void) | null = null;
    public onicegatheringstatechange: (() => void) | null = null;
    public onicecandidate: ((event: any) => void) | null = null;
    public ontrack: ((event: any) => void) | null = null;
    public iceConnectionState: RTCIceConnectionState = 'new';
    public iceGatheringState: RTCIceGatheringState = 'new';

    public createOffer = jest.fn().mockResolvedValue({ type: 'offer', sdp: 'offer-sdp' });
    public createAnswer = jest.fn().mockResolvedValue({ type: 'answer', sdp: 'answer-sdp' });
    public setLocalDescription = jest.fn().mockResolvedValue(undefined);
    public setRemoteDescription = jest.fn().mockResolvedValue(undefined);
    public addIceCandidate = jest.fn().mockResolvedValue(undefined);
    public close = jest.fn();
    public replaceTrack = jest.fn().mockResolvedValue(undefined);
    public addTrack = jest.fn(() => ({ replaceTrack: this.replaceTrack }));
    public restartIce = jest.fn();
    public getStats = jest.fn().mockResolvedValue(new Map());

    constructor(public config: unknown) {}
}

function installWebRtcGlobals() {
    (globalThis as any).RTCPeerConnection = FakeRTCPeerConnection;
    (globalThis as any).RTCSessionDescription = class {
        type: string; sdp: string;
        constructor(init: { type: string; sdp: string }) { this.type = init.type; this.sdp = init.sdp; }
    };
    (globalThis as any).RTCIceCandidate = class {
        candidate: string;
        constructor(init: { candidate: string }) { this.candidate = init.candidate; }
    };
    (globalThis as any).navigator = {
        mediaDevices: {
            getUserMedia: jest.fn().mockResolvedValue(makeFakeStream([makeFakeTrack('audio')])),
        },
    };
}

function uninstallWebRtcGlobals() {
    delete (globalThis as any).RTCPeerConnection;
    delete (globalThis as any).RTCSessionDescription;
    delete (globalThis as any).RTCIceCandidate;
    delete (globalThis as any).navigator;
}

async function createPeer(
    subs: Map<callEvents, Set<Function>> = new Map(),
    options: PeerOptions = {},
): Promise<{ peer: Peer; pc: FakeRTCPeerConnection; sendSignal: jest.Mock }> {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const peer = new Peer(
        () => subs,
        sendSignal,
        new Logger('test'),
        undefined,
        options,
    );
    // Flush the local-stream-acquisition promise kicked off by the constructor.
    await Promise.resolve();
    await Promise.resolve();
    const pc = (peer as unknown as { pc: FakeRTCPeerConnection }).pc;
    return { peer, pc, sendSignal };
}

function withMeta<T extends { type: string }>(signal: T): T & { callId: string; seq: number; timestamp: number } {
    return { ...signal, callId: 'call-1', seq: 1, timestamp: Date.now() };
}

describe('Peer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        installWebRtcGlobals();
    });

    afterEach(() => {
        uninstallWebRtcGlobals();
    });

    it('acquires the local audio stream and adds it as a track (no per-frame encryption is applied)', async () => {
        const { pc } = await createPeer();

        expect((globalThis as any).navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
        expect(pc.addTrack).toHaveBeenCalledTimes(1);
    });

    it('constructs the RTCPeerConnection without the legacy encodedInsertableStreams option', async () => {
        const { pc } = await createPeer();
        expect((pc.config as any).encodedInsertableStreams).toBeUndefined();
    });

    it('uses configured ICE servers and relay-only policy', async () => {
        const iceServers = [{ urls: 'turn:turn.example.test', username: 'u', credential: 'p' }];
        const { pc } = await createPeer(new Map(), {
            webrtc: { iceServers, iceTransportPolicy: 'relay' },
        });

        expect(pc.config).toEqual({ iceServers, iceTransportPolicy: 'relay' });
    });

    it('createAndSendOffer() creates + sets a local offer and sends it via the injected sendSignal', async () => {
        const { peer, pc, sendSignal } = await createPeer();

        await peer.createAndSendOffer();

        expect(pc.createOffer).toHaveBeenCalled();
        expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'offer-sdp' });
        expect(sendSignal).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'offer', sdp: 'offer-sdp', callId: expect.any(String), seq: expect.any(Number), timestamp: expect.any(Number) }),
        );
    });

    it('signal() with an offer sets the remote description and replies with an answer', async () => {
        const { peer, pc, sendSignal } = await createPeer();
        const offer: WebRtcSignalPayload = withMeta({ type: 'offer', sdp: 'remote-offer' });

        await peer.signal(offer);

        expect(pc.setRemoteDescription).toHaveBeenCalledWith(expect.objectContaining({ type: 'offer', sdp: 'remote-offer' }));
        expect(pc.createAnswer).toHaveBeenCalled();
        expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'answer-sdp' });
        expect(sendSignal).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'answer', sdp: 'answer-sdp', callId: expect.any(String), seq: expect.any(Number), timestamp: expect.any(Number) }),
        );
    });

    it('signal() with an answer only sets the remote description', async () => {
        const { peer, pc } = await createPeer();
        const answer: WebRtcSignalPayload = withMeta({ type: 'answer', sdp: 'remote-answer' });

        await peer.signal(answer);

        expect(pc.setRemoteDescription).toHaveBeenCalledWith(expect.objectContaining({ type: 'answer', sdp: 'remote-answer' }));
        expect(pc.createAnswer).not.toHaveBeenCalled();
    });

    it('signal() with a candidate adds it as an ICE candidate', async () => {
        const { peer, pc } = await createPeer();
        const candidate: WebRtcSignalPayload = withMeta({ type: 'candidate', candidate: { candidate: 'ice-1' } as RTCIceCandidateInit });

        await peer.signal(candidate);

        expect(pc.addIceCandidate).toHaveBeenCalledWith(expect.objectContaining({ candidate: 'ice-1' }));
    });

    it('onicecandidate forwards gathered local candidates via the injected sendSignal', async () => {
        const { pc, sendSignal } = await createPeer();
        sendSignal.mockClear();

        pc.onicecandidate!({ candidate: { candidate: 'local-ice' } });

        expect(sendSignal).toHaveBeenCalledWith(
            expect.objectContaining({ candidate: { candidate: 'local-ice' }, type: 'candidate', callId: expect.any(String), seq: expect.any(Number), timestamp: expect.any(Number) }),
        );
    });

    it('onicecandidate is a no-op once ICE gathering completes (candidate is null)', async () => {
        const { pc, sendSignal } = await createPeer();
        sendSignal.mockClear();

        pc.onicecandidate!({ candidate: null });

        expect(sendSignal).not.toHaveBeenCalled();
    });

    it('emits ICE journey events for local and remote candidates', async () => {
        const cb = jest.fn();
        const subs = new Map<callEvents, Set<Function>>([['ice-journey', new Set([cb])]]);
        const { peer, pc } = await createPeer(subs);

        pc.onicecandidate!({ candidate: { candidate: 'candidate:1 1 udp 1 10.0.0.1 123 typ host' } });
        await peer.signal(withMeta({ type: 'candidate', candidate: { candidate: 'candidate:2 1 udp 1 198.51.100.1 456 typ srflx' } as RTCIceCandidateInit }));

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'local-candidate', candidateType: 'host' }));
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'remote-candidate', candidateType: 'srflx' }));
    });

    it('onconnectionstatechange notifies all state-changed subscribers with the new state', async () => {
        const subs = new Map<callEvents, Set<Function>>();
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        subs.set('state-changed', new Set([cb1, cb2]));
        const { peer, pc } = await createPeer(subs);

        pc.connectionState = 'connected';
        pc.onconnectionstatechange!();

        expect(peer.callState).toBe('connected');
        expect(cb1).toHaveBeenCalledWith('connected');
        expect(cb2).toHaveBeenCalledWith('connected');
    });

    it('automatically requests ICE restart on failed when self-healing is enabled', async () => {
        const onAutoRestartNeeded = jest.fn();
        const { pc } = await createPeer(new Map(), {
            webrtc: { selfHealing: { enabled: true } },
            onAutoRestartNeeded,
        });

        pc.connectionState = 'failed';
        pc.onconnectionstatechange!();

        expect(onAutoRestartNeeded).toHaveBeenCalledWith('failed');
    });

    it('restartIce() restarts ICE and sends an ICE restart offer', async () => {
        const cb = jest.fn();
        const subs = new Map<callEvents, Set<Function>>([['ice-journey', new Set([cb])]]);
        const { peer, pc, sendSignal } = await createPeer(subs);
        sendSignal.mockClear();

        await peer.restartIce();

        expect(pc.restartIce).toHaveBeenCalled();
        expect(pc.createOffer).toHaveBeenCalledWith({ iceRestart: true });
        expect(sendSignal).toHaveBeenCalledWith(expect.objectContaining({ type: 'offer', sdp: 'offer-sdp' }));
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'ice-restart', reason: 'manual' }));
    });

    it('emits call metrics snapshots from getStats()', async () => {
        const cb = jest.fn();
        const subs = new Map<callEvents, Set<Function>>([['ice-journey', new Set([cb])]]);
        const { peer, pc } = await createPeer(subs);
        pc.getStats.mockResolvedValue(new Map([
            ['in', { id: 'in', type: 'inbound-rtp', kind: 'audio', bytesReceived: 1000, packetsLost: 1, packetsReceived: 9, jitter: 0.02, audioLevel: 0.3 }],
            ['out', { id: 'out', type: 'outbound-rtp', kind: 'audio', bytesSent: 2000 }],
            ['local', { id: 'local', type: 'local-candidate', candidateType: 'host', address: '10.0.0.1' }],
            ['remote', { id: 'remote', type: 'remote-candidate', candidateType: 'relay', address: '203.0.113.1' }],
            ['pair', { id: 'pair', type: 'candidate-pair', selected: true, localCandidateId: 'local', remoteCandidateId: 'remote', currentRoundTripTime: 0.05, availableOutgoingBitrate: 100000 }],
        ]));

        const metrics = await peer.getStatsSnapshot();

        expect(metrics).toEqual(expect.objectContaining({
            packetsLost: 1,
            packetLossRatio: 0.1,
            jitterMs: 20,
            rttMs: 50,
            availableOutgoingBitrateKbps: 100,
            localCandidateType: 'host',
            remoteCandidateType: 'relay',
        }));
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'selected-candidate-pair-change', selectedCandidatePairId: 'pair' }));
    });

    it('supports mute, unmute, input device switch, and output device selection', async () => {
        const firstTrack = makeFakeTrack('audio');
        const secondTrack = makeFakeTrack('audio');
        (globalThis as any).navigator.mediaDevices.getUserMedia
            .mockResolvedValueOnce(makeFakeStream([firstTrack]))
            .mockResolvedValueOnce(makeFakeStream([secondTrack]));
        const { peer, pc } = await createPeer();

        peer.mute();
        expect(firstTrack.enabled).toBe(false);
        expect(peer.muted).toBe(true);

        await peer.switchInputDevice('mic-2');
        expect((globalThis as any).navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: { deviceId: { exact: 'mic-2' } }, video: false });
        expect(pc.replaceTrack).toHaveBeenCalledWith(secondTrack);
        expect(firstTrack.stop).toHaveBeenCalled();
        expect(secondTrack.enabled).toBe(false);

        peer.unmute();
        expect(secondTrack.enabled).toBe(true);
        await peer.setOutputDevice('speaker-1');
        expect(mockSetOutputDevice).toHaveBeenCalledWith('speaker-1');
    });

    it('ontrack attaches the remote stream to the AudioSink', async () => {
        const { pc } = await createPeer();
        const remoteTrack = makeFakeTrack('audio');
        const remoteStream = makeFakeStream([remoteTrack]);

        pc.ontrack!({ streams: [remoteStream] });

        expect(mockAttach).toHaveBeenCalledWith(remoteStream, 'remote');
    });

    it('dispose() stops local tracks, detaches audio, and closes the connection', async () => {
        const { peer, pc } = await createPeer();

        peer.dispose();

        expect(mockDetach).toHaveBeenCalled();
        expect(pc.close).toHaveBeenCalled();
    });
});
