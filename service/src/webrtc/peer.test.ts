import { Logger } from '../utils/logger';
import type { callEvents, WebRtcSignalPayload } from './types';

// ---------------------------------------------------------------------------
// Mocks for the WebRTC/DOM globals + collaborator modules Peer depends on.
// ---------------------------------------------------------------------------
const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDetach = jest.fn();
jest.mock('./audioSink', () => ({
    AudioSink: jest.fn().mockImplementation(() => ({
        attach: mockAttach,
        detach: mockDetach,
    })),
}));

import { Peer } from './peer';

interface FakeTrack {
    kind: string;
    stop: jest.Mock;
}

function makeFakeTrack(kind = 'audio'): FakeTrack {
    return { kind, stop: jest.fn() };
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
    public onicecandidate: ((event: any) => void) | null = null;
    public ontrack: ((event: any) => void) | null = null;

    public createOffer = jest.fn().mockResolvedValue({ type: 'offer', sdp: 'offer-sdp' });
    public createAnswer = jest.fn().mockResolvedValue({ type: 'answer', sdp: 'answer-sdp' });
    public setLocalDescription = jest.fn().mockResolvedValue(undefined);
    public setRemoteDescription = jest.fn().mockResolvedValue(undefined);
    public addIceCandidate = jest.fn().mockResolvedValue(undefined);
    public close = jest.fn();
    public addTrack = jest.fn();

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

async function createPeer(subs: Map<callEvents, Set<Function>> = new Map()): Promise<{ peer: Peer; pc: FakeRTCPeerConnection; sendSignal: jest.Mock }> {
    const sendSignal = jest.fn().mockResolvedValue(undefined);
    const peer = new Peer(
        () => subs,
        sendSignal,
        new Logger('test'),
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
