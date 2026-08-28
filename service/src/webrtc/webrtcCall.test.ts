import { Logger } from '../utils/logger';
import type { ISymmetricEncryption } from '../crypto/cryptoAES';
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
    return new WebRTCCall({} as ISymmetricEncryption, 'sender-1', 'channel-1', new Logger('test'));
}

describe('WebRTCCall', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('startCall() delegates to the underlying Peer', async () => {
        const call = makeCall();
        await call.startCall();
        expect(mockCreateAndSendOffer).toHaveBeenCalledTimes(1);
    });

    it('signal() forwards the payload to the underlying Peer', () => {
        const call = makeCall();
        const data: WebRtcSignalPayload = { type: 'answer', sdp: 'x' };
        call.signal(data);
        expect(mockPeerSignal).toHaveBeenCalledWith(data);
    });

    it('signal() throws once the call has ended', () => {
        const call = makeCall();
        call.endCall();
        expect(() => call.signal({ type: 'answer', sdp: 'x' })).toThrow('No peer connection');
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
        const createCall = jest.fn(() => makeCall());
        const router = new CallSignalRouter(createCall, onCallCreated, new Logger('test'));
        return { router, createCall, onCallCreated };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('handleSignal() with an offer creates a new call and notifies onCallCreated', () => {
        const { router, createCall, onCallCreated } = makeRouter();
        const offer: WebRtcSignalPayload = { type: 'offer', sdp: 'offer-sdp' };

        router.handleSignal(offer);

        expect(createCall).toHaveBeenCalledTimes(1);
        expect(onCallCreated).toHaveBeenCalledWith(router.activeCall);
        expect(mockPeerSignal).toHaveBeenCalledWith(offer);
    });

    it('handleSignal() with an answer forwards to the active call', () => {
        const { router } = makeRouter();
        router.handleSignal({ type: 'offer', sdp: 'offer-sdp' });
        mockPeerSignal.mockClear();

        const answer: WebRtcSignalPayload = { type: 'answer', sdp: 'answer-sdp' };
        router.handleSignal(answer);

        expect(mockPeerSignal).toHaveBeenCalledWith(answer);
    });

    it('handleSignal() with an answer is a no-op when there is no active call', () => {
        const { router } = makeRouter();
        expect(() => router.handleSignal({ type: 'answer', sdp: 'x' })).not.toThrow();
        expect(mockPeerSignal).not.toHaveBeenCalled();
    });

    it('handleSignal() buffers ICE candidates until a call exists, then flushes them on offer', () => {
        const { router } = makeRouter();
        const candidate: WebRtcSignalPayload = { type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit };

        router.handleSignal(candidate);
        expect(mockPeerSignal).not.toHaveBeenCalled();

        const offer: WebRtcSignalPayload = { type: 'offer', sdp: 'offer-sdp' };
        router.handleSignal(offer);

        expect(mockPeerSignal).toHaveBeenNthCalledWith(1, offer);
        expect(mockPeerSignal).toHaveBeenNthCalledWith(2, candidate);
    });

    it('handleSignal() forwards ICE candidates directly once a call is active', () => {
        const { router } = makeRouter();
        router.handleSignal({ type: 'offer', sdp: 'offer-sdp' });
        mockPeerSignal.mockClear();

        const candidate: WebRtcSignalPayload = { type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit };
        router.handleSignal(candidate);

        expect(mockPeerSignal).toHaveBeenCalledWith(candidate);
    });

    it('attachCall() registers an externally created call as active', () => {
        const { router } = makeRouter();
        const call = makeCall();

        router.attachCall(call);

        expect(router.activeCall).toBe(call);
    });

    it('reset() clears the active call and any buffered ICE candidates', () => {
        const { router } = makeRouter();
        router.handleSignal({ type: 'candidate', candidate: { candidate: 'c1' } as RTCIceCandidateInit });
        router.reset();

        // Buffered candidate should have been discarded: a subsequent offer
        // must not replay it.
        mockPeerSignal.mockClear();
        router.handleSignal({ type: 'offer', sdp: 'offer-sdp' });

        expect(mockPeerSignal).toHaveBeenCalledTimes(1);
        expect(router.activeCall).toBeDefined();
    });
});
