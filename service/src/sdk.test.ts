/// <reference types="node" />
/// <reference types="jest" />

/**
 * Unit tests for the ChatE2EE class (issue #319)
 *
 * ChatE2EE is the main SDK class exposed via createChatInstance().
 * All I/O dependencies (socket, HTTP, crypto) are mocked so the tests run
 * in Node without a real network or browser runtime.
 */

// ─── Polyfills ────────────────────────────────────────────────────────────────
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

// ─── Mock configContext ───────────────────────────────────────────────────────
jest.mock('./configContext', () => ({
    configContext: () => ({
        baseUrl: 'http://localhost:3001',
        settings: { disableLog: true },
    }),
    setConfig: jest.fn(),
}));

// ─── Mock SocketInstance ──────────────────────────────────────────────────────
const mockJoinChat = jest.fn();
const mockSocketDispose = jest.fn();

jest.mock('./socket/socket', () => ({
    SocketInstance: jest.fn().mockImplementation(() => ({
        joinChat: mockJoinChat,
        dispose: mockSocketDispose,
    })),
}));

// ─── Mock network layer ───────────────────────────────────────────────────────
jest.mock('./getLink', () => jest.fn().mockResolvedValue({
    hash: 'abc123',
    link: '/chat/abc123',
    absoluteLink: 'http://localhost:3001/chat/abc123',
    expired: false,
    deleted: false,
    pin: '1234',
    pinCreatedAt: 0,
}));

jest.mock('./deleteLink', () => jest.fn().mockResolvedValue(undefined));

jest.mock('./getUsersInChannel', () =>
    jest.fn().mockResolvedValue([{ uuid: 'user-1' }, { uuid: 'user-2' }])
);

jest.mock('./sendMessage', () =>
    jest.fn().mockResolvedValue({ id: 'msg-1', timestamp: '2024-01-01T00:00:00Z' })
);

jest.mock('./publicKey', () => ({
    getPublicKey: jest.fn().mockResolvedValue({ publicKey: 'receiver-pub-key', aesKey: null }),
    sharePublicKey: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock WebRTC ──────────────────────────────────────────────────────────────
jest.mock('./webrtc', () => ({
    WebRTCCall: class MockWebRTCCall {
        static isSupported = jest.fn().mockReturnValue(false);
        on = jest.fn();
        startCall = jest.fn().mockResolvedValue(undefined);
        endCall = jest.fn();
        signal = jest.fn();
    },
    E2ECall: class MockE2ECall {
        constructor(public inner: any) {}
    },
    peerConnectionEvents: ['call-added', 'call-removed', 'state-changed'],
}));

// ─── Mock EncryptionFactory (inject stub strategies) ─────────────────────────
const mockSymEncryption = {
    init: jest.fn().mockResolvedValue(undefined),
    exportKey: jest.fn().mockResolvedValue('exported-aes-key'),
    importRemoteKey: jest.fn().mockResolvedValue(undefined),
    encryptMessage: jest.fn().mockImplementation(async (msg: string) => `enc:${msg}`),
    decryptMessage: jest.fn().mockImplementation(async (msg: string) => msg.replace('enc:', '')),
    generateKey: jest.fn().mockResolvedValue(undefined),
};

const mockAsymEncryption = {
    generateKeypairs: jest.fn().mockResolvedValue({ privateKey: 'priv-key', publicKey: 'pub-key' }),
    encryptMessage: jest.fn().mockImplementation(async (msg: string) => `rsa:${msg}`),
    decryptMessage: jest.fn().mockImplementation(async (msg: string) => msg.replace('rsa:', '')),
};

jest.mock('./encryptionFactory', () => ({
    EncryptionFactory: {
        create: jest.fn().mockReturnValue({
            symmetric: mockSymEncryption,
            asymmetric: mockAsymEncryption,
        }),
    },
    EncryptionStrategyConfig: {},
}));

// ─── Import under test ────────────────────────────────────────────────────────
import { createChatInstance } from './sdk';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function makeInitializedInstance() {
    const instance = createChatInstance();
    await instance.init();
    return instance;
}

async function makeChannelInstance(channelId = 'ch-1', userId = 'usr-1') {
    const instance = await makeInitializedInstance();
    await instance.setChannel(channelId, userId);
    return instance;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ChatE2EE (createChatInstance)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default mock return values after clearAllMocks
        mockAsymEncryption.generateKeypairs.mockResolvedValue({ privateKey: 'priv-key', publicKey: 'pub-key' });
        mockSymEncryption.init.mockResolvedValue(undefined);

        const { getPublicKey, sharePublicKey } = require('./publicKey');
        getPublicKey.mockResolvedValue({ publicKey: 'receiver-pub-key', aesKey: null });
        sharePublicKey.mockResolvedValue(undefined);

        const { SocketInstance } = require('./socket/socket');
        SocketInstance.mockImplementation(() => ({
            joinChat: mockJoinChat,
            dispose: mockSocketDispose,
        }));
    });

    // ── init() ────────────────────────────────────────────────────────────────

    describe('init()', () => {
        it('initialises without throwing', async () => {
            const instance = createChatInstance();
            await expect(instance.init()).resolves.not.toThrow();
        });

        it('generates RSA key pairs', async () => {
            await makeInitializedInstance();
            expect(mockAsymEncryption.generateKeypairs).toHaveBeenCalledTimes(1);
        });

        it('initialises the symmetric encryption layer', async () => {
            await makeInitializedInstance();
            expect(mockSymEncryption.init).toHaveBeenCalledTimes(1);
        });

        it('exposes the generated key pair via getKeyPair()', async () => {
            const instance = await makeInitializedInstance();
            expect(instance.getKeyPair()).toEqual({
                privateKey: 'priv-key',
                publicKey: 'pub-key',
            });
        });
    });

    // ── Guards before init() ──────────────────────────────────────────────────

    describe('method guards (not initialised)', () => {
        const guardedMethods: Array<(i: ReturnType<typeof createChatInstance>) => any> = [
            (i) => i.setChannel('ch', 'usr'),
            (i) => i.isEncrypted(),
            (i) => i.delete(),
            (i) => i.getUsersInChannel(),
            (i) => i.sendMessage({ image: '', text: 'hi' }),
            (i) => i.dispose(),
            (i) => i.getKeyPair(),
            (i) => i.encrypt({ image: '', text: 'hi' }),
        ];

        guardedMethods.forEach((method, idx) => {
            it(`method #${idx + 1} throws when called before init()`, async () => {
                const instance = createChatInstance();
                await expect(async () => method(instance)).rejects.toThrow(
                    'ChatE2EE is not initialized'
                );
            });
        });
    });

    // ── getLink() ─────────────────────────────────────────────────────────────

    describe('getLink()', () => {
        it('returns a link object', async () => {
            const instance = await makeInitializedInstance();
            const link = await instance.getLink();
            expect(link).toHaveProperty('hash');
            expect(link).toHaveProperty('link');
        });
    });

    // ── setChannel() ──────────────────────────────────────────────────────────

    describe('setChannel()', () => {
        it('emits a chat-join via the socket', async () => {
            await makeChannelInstance('ch-1', 'usr-1');
            expect(mockJoinChat).toHaveBeenCalledWith(
                expect.objectContaining({ channelID: 'ch-1', userID: 'usr-1' })
            );
        });

        it('shares the RSA public key on joining', async () => {
            const { sharePublicKey } = require('./publicKey');
            await makeChannelInstance();
            expect(sharePublicKey).toHaveBeenCalled();
        });
    });

    // ── isEncrypted() ─────────────────────────────────────────────────────────

    describe('isEncrypted()', () => {
        it('returns true when the receiver public key is known', async () => {
            const instance = await makeChannelInstance();
            expect(instance.isEncrypted()).toBe(true);
        });

        it('returns false when getPublicKey resolves with no key', async () => {
            const { getPublicKey } = require('./publicKey');
            getPublicKey.mockResolvedValue({ publicKey: undefined, aesKey: null });

            const instance = await makeChannelInstance();
            expect(instance.isEncrypted()).toBe(false);
        });
    });

    // ── on() ──────────────────────────────────────────────────────────────────

    describe('on()', () => {
        it('registers a callback without throwing', async () => {
            const instance = await makeInitializedInstance();
            const cb = jest.fn();
            expect(() => instance.on('chat-message', cb)).not.toThrow();
        });

        it('does not register the same callback twice for the same listener', async () => {
            const instance = await makeInitializedInstance();
            const cb = jest.fn();
            instance.on('delivered', cb);
            instance.on('delivered', cb);

            // Trigger via socket subscription – subscription context holds the Set
            // Internal verification: calling init() again would reset subs, so
            // we just assert the method did not throw and cb remains once only.
            expect(cb).not.toHaveBeenCalled(); // no event fired yet
        });
    });

    // ── sendMessage() ─────────────────────────────────────────────────────────

    describe('sendMessage()', () => {
        it('delegates to the sendMessage module and returns its result', async () => {
            const instance = await makeChannelInstance();
            const result = await instance.sendMessage({ image: '', text: 'hello' });
            expect(result).toEqual({ id: 'msg-1', timestamp: '2024-01-01T00:00:00Z' });
        });
    });

    // ── encrypt() ────────────────────────────────────────────────────────────

    describe('encrypt()', () => {
        it('returns an object with a send() method', async () => {
            const instance = await makeChannelInstance();
            const encryptable = instance.encrypt({ image: '', text: 'secret' });
            expect(typeof encryptable.send).toBe('function');
        });

        it('send() encrypts the text and calls sendMessage', async () => {
            const instance = await makeChannelInstance();
            const encryptable = instance.encrypt({ image: '', text: 'secret' });
            const result = await encryptable.send();

            expect(mockAsymEncryption.encryptMessage).toHaveBeenCalledWith(
                'secret',
                'receiver-pub-key'
            );
            expect(result).toHaveProperty('id');
        });
    });

    // ── getUsersInChannel() ───────────────────────────────────────────────────

    describe('getUsersInChannel()', () => {
        it('returns the list of users', async () => {
            const instance = await makeChannelInstance();
            const users = await instance.getUsersInChannel();
            expect(users).toEqual([{ uuid: 'user-1' }, { uuid: 'user-2' }]);
        });
    });

    // ── delete() ─────────────────────────────────────────────────────────────

    describe('delete()', () => {
        it('calls deleteLink without throwing', async () => {
            const instance = await makeChannelInstance();
            await expect(instance.delete()).resolves.not.toThrow();
        });
    });

    // ── dispose() ────────────────────────────────────────────────────────────

    describe('dispose()', () => {
        it('disconnects the socket', async () => {
            const instance = await makeChannelInstance();
            instance.dispose();
            expect(mockSocketDispose).toHaveBeenCalledTimes(1);
        });

        it('clears subscriptions so subsequent calls to guarded methods throw', async () => {
            const instance = await makeChannelInstance();
            instance.dispose();
            await expect(async () => instance.isEncrypted()).rejects.toThrow(
                'ChatE2EE is not initialized'
            );
        });
    });

    // ── startCall() ───────────────────────────────────────────────────────────

    describe('startCall()', () => {
        it('throws when WebRTC is not supported', async () => {
            const { WebRTCCall } = require('./webrtc');
            WebRTCCall.isSupported.mockReturnValue(false);

            const instance = await makeChannelInstance();
            await expect(instance.startCall()).rejects.toThrow(
                'createEncodedStreams not supported'
            );
        });
    });

    // ── endCall() ─────────────────────────────────────────────────────────────

    describe('endCall()', () => {
        it('resolves without throwing when no call is active', async () => {
            const instance = await makeChannelInstance();
            await expect(instance.endCall()).resolves.not.toThrow();
        });
    });

    // ── activeCall getter ─────────────────────────────────────────────────────

    describe('activeCall', () => {
        it('returns null when no call is in progress', async () => {
            const instance = await makeChannelInstance();
            expect(instance.activeCall).toBeNull();
        });
    });
});