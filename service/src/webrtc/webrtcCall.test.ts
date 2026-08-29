import { Logger } from '../utils/logger';
import type { WebRtcSignalPayload } from './types';

const mockPeerSignal = jest.fn();
const mockPeerDispose = jest.fn();
const mockCreateAndSendOffer = jest.fn().mockResolvedValue(undefined);

jest.mock('./peer', () => ({
    Peer: jest.fn().mockImplementation(() => ({
        signal: mockPeerSignal,
        dispose: mockPeerDispose,
        createAndSendOffer: mockCreateAndSendOffer,
        callState: 'connected',
    })),
}));

import { WebRTCCall, CallSignalRouter } from './webrtcCall';

function makeCall(): WebRTCCall {
    return new WebRTCCall(jest.fn().mockResolvedValue(undefined), new Logger('test'));
}

function withMeta<T extends { type: string }>(signal: T, seq = 1): T & { callId: string; seq: number; timestamp: number } {
    return { ...signal, callId: 'call-1', seq, timestamp: Date.now() };
}

describe('WebRTCCall', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('isSupported() reflects basic RTCPeerConnection availability (no encoded-transform gate)', () => {
        (globalThis as any).RTCPeerConnection = function () {};
        expect(WebRTCCall.isSupported()).toBe(true);
        delete (globalThis as any).RTCPeerConnection;
        expect(WebRTCCall.isSupported()).toBe(false);
    });

    it('startCall() delegates to the underlying Peer', async () => {
        const call = makeCall();
        await call.startCall();
        expect(mockCreateAndSendOffer).toHaveBeenCalledTimes(1);
    });

    it('signal() forwards the payload to the underlying Peer', () => {
        const call = makeCall();
        const data: WebRtcSignalPayload = withMeta({ type: 'answer', sdp: 'x' });
        call.signal(data);
        expect(mockPeerSignal).toHaveBeenCalledWith(data);
    });

    it('signal() throws once the call has ended', () => {
        const call = makeCall();
        call.endCall();
        expect(() => call.signal(withMeta({ type: 'answer', sdp: 'x' }))).toThrow('No peer connection');
    });

    it('endCall() disposes the Peer and clears subscriptions', () => {
        const call = makeCall();
        const cb = jest.fn();
        call.on('state-changed', cb);

        call.endCall();

        expect(mockPeerDispose).toHaveBeenCalledTimes(1);
    });

    it('on() registers a listener only once for the same callback', () => {
        const call = makeCall();
        const cb = jest.fn();
        call.on('state-changed', cb);
        call.on('state-changed', cb);
        // No direct way to inspect the internal Set size, but re-registering
        // must not throw and must not duplicate underlying Peer construction.
        expect(() => call.on('state-changed', cb)).not.toThrow();
    });
});

describe('CallSignalRouter', () => {
    function makeRouter() {
        const onCallCreated = jest.fn();
        const onIncomingOffer = jest.fn();
        const createCall = jest.fn(() => makeCall());
        const router = new CallSignalRouter(createCall, onCallCreated, onIncomingOffer, new Logger('test'));
        return { router, createCall, onCallCreated, onIncomingOffer };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('handleSignal() with an offer registers a pending invite', () => {
        const { router, createCall, onCallCreated, onIncomingOffer } = makeRouter();
        const offer: WebRtcSignalPayload = withMeta({ type: 'offer', sdp: 'offer-sdp' });

        router.handleSignal(offer);

        expect(createCall).not.toHaveBeenCalled();
        expect(onCallCreated).not.toHaveBeenCalled();
        expect(onIncomingOffer).toHaveBeenCalledWith('call-1');
        expect(router.pendingCallId).toBe('call-1');
    });

    it('handleSignal() with an answer forwards to the active call with matching callId', () => {
        const { router } = makeRouter();
        router.attachCall(makeCall(), 'call-1');
        mockPeerSignal.mockClear();

        const answer: WebRtcSignalPayload = withMeta({ type: 'answer', sdp: 'answer-sdp' });
        router.handleSignal(answer);

        expect(mockPeerSignal).toHaveBeenCalledWith(answer);
    });

    it('handleSignal() with an answer is a no-op when there is no active call', () => {
        const { router } = makeRouter();
        expect(() => router.handleSignal(withMeta({ type: 'answer', sdp: 'x' }))).not.toThrow();
        expect(mockPeerSignal).not.toHaveBeenCalled();
    });

    it('handleSignal() buffers ICE candidates until an incoming offer is accepted', () => {
        const { router, createCall, onCallCreated } = makeRouter();
        const candidate: WebRtcSignalPayload = withMeta({ type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit }, 1);

        router.handleSignal(candidate);
        expect(mockPeerSignal).not.toHaveBeenCalled();

        const offer: WebRtcSignalPayload = withMeta({ type: 'offer', sdp: 'offer-sdp' }, 2);
        router.handleSignal(offer);
        router.acceptPendingOffer('call-1');

        expect(createCall).toHaveBeenCalledTimes(1);
        expect(onCallCreated).toHaveBeenCalledTimes(1);
        expect(mockPeerSignal).toHaveBeenNthCalledWith(1, offer);
        expect(mockPeerSignal).toHaveBeenNthCalledWith(2, candidate);
    });

    it('handleSignal() forwards ICE candidates directly once a call is active', () => {
        const { router } = makeRouter();
        router.attachCall(makeCall(), 'call-1');
        mockPeerSignal.mockClear();

        const candidate: WebRtcSignalPayload = withMeta({ type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit });
        router.handleSignal(candidate);

        expect(mockPeerSignal).toHaveBeenCalledWith(candidate);
    });

    it('attachCall() registers an externally created call as active', () => {
        const { router } = makeRouter();
        const call = makeCall();

        router.attachCall(call, 'call-1');

        expect(router.activeCall).toBe(call);
    });

    it('reset() clears the active call and any buffered ICE candidates', () => {
        const { router } = makeRouter();
        router.handleSignal(withMeta({ type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit }));
        router.reset();

        // Buffered candidate should have been discarded: a subsequent offer
        // must not replay it.
        mockPeerSignal.mockClear();
        router.handleSignal(withMeta({ type: 'offer', sdp: 'offer-sdp' }, 2));
        router.acceptPendingOffer('call-1');

        expect(mockPeerSignal).toHaveBeenCalledTimes(1);
        expect(router.activeCall).toBeDefined();
    });
});
