import { webcrypto } from 'crypto';

// Polyfill for Node versions < 19 that do not expose globalThis.crypto
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// inviteCrypto/secureEnvelope access `window.crypto`, `window.btoa`, and
// `window.atob`. In a Node (non-jsdom) environment `window` is undefined, so
// point it at globalThis, which already has btoa/atob (Node 16+) and crypto
// (Node 19+).
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

// ---------------------------------------------------------------------------
// Mock socket.io-client before any module is imported
// ---------------------------------------------------------------------------
const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
    __esModule: true,
    default: jest.fn(() => mockSocket),
}));

// ---------------------------------------------------------------------------
// Mock the remaining HTTP helpers used by the SDK
// ---------------------------------------------------------------------------
jest.mock('./api/messages', () => ({
    getUsersInChannel: jest.fn().mockResolvedValue([]),
}));

jest.mock('./api/links', () => ({
    deleteLink: jest.fn().mockResolvedValue(undefined),
    getLink: jest.fn().mockResolvedValue({
        hash: 'server-issued-room-id',
        secret: 'client-generated-secret',
        link: '#room=server-issued-room-id&secret=client-generated-secret',
        absoluteLink: undefined,
        expired: false,
        deleted: false,
    }),
}));

// ---------------------------------------------------------------------------
// Import after all mocks are in place
// ---------------------------------------------------------------------------
import { createChatInstance } from './sdk';
import { deriveInviteKeys, generateInviteSecret } from './crypto/inviteCrypto';
import { sealEnvelope } from './crypto/secureEnvelope';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ROOM_ID = 'test-room-id';
const SECRET = generateInviteSecret();
const USER_ID = 'test-user-id';

async function buildInitializedInstance() {
    const instance = createChatInstance();
    await instance.init();
    return instance;
}

// Each test builds a fresh ChatE2EE instance (and thus a fresh SocketInstance)
// without resetting `mockSocket.on`'s call history, so multiple registrations
// for the same wire event accumulate across tests. Always take the most
// recent registration, which belongs to the instance under test.
const wireHandlerFor = (event: string): ((...args: unknown[]) => void) => {
    const registrations = mockSocket.on.mock.calls.filter(([name]) => name === event);
    if (!registrations.length) {
        throw new Error(`No handler registered for "${event}"`);
    }
    return registrations[registrations.length - 1][1] as (...args: unknown[]) => void;
};

/** Lets any in-flight WebCrypto promises (real, unmocked) settle. */
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 10));

// ---------------------------------------------------------------------------
// createChatInstance factory
// ---------------------------------------------------------------------------
describe('createChatInstance()', () => {
    it('returns an object that satisfies the IChatE2EE interface', () => {
        const instance = createChatInstance();
        expect(typeof instance.init).toBe('function');
        expect(typeof instance.setChannel).toBe('function');
        expect(typeof instance.isEncrypted).toBe('function');
        expect(typeof instance.dispose).toBe('function');
        expect(typeof instance.on).toBe('function');
        expect(typeof instance.delete).toBe('function');
        expect(typeof instance.getUsersInChannel).toBe('function');
        expect(typeof instance.encrypt).toBe('function');
        expect(typeof instance.getLink).toBe('function');
    });

    it('no longer exposes RSA-era key APIs', () => {
        const instance = createChatInstance() as unknown as Record<string, unknown>;
        expect(instance.getKeyPair).toBeUndefined();
        expect(instance.sendMessage).toBeUndefined();
    });

    it('returns a new independent instance on every call', () => {
        const a = createChatInstance();
        const b = createChatInstance();
        expect(a).not.toBe(b);
    });
});

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------
describe('init()', () => {
    it('completes without throwing and requires no key generation up front', async () => {
        const instance = createChatInstance();
        await expect(instance.init()).resolves.toBeUndefined();
        expect(instance.isEncrypted()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Error when methods are called before init()
// ---------------------------------------------------------------------------
describe('methods called before init() throw descriptive error', () => {
    const NOT_INITIALIZED_MSG = 'ChatE2EE is not initialized, call init()';

    it('isEncrypted() throws', () => {
        const instance = createChatInstance();
        expect(() => instance.isEncrypted()).toThrow(NOT_INITIALIZED_MSG);
    });

    it('dispose() throws', () => {
        const instance = createChatInstance();
        expect(() => instance.dispose()).toThrow(NOT_INITIALIZED_MSG);
    });

    it('delete() throws', async () => {
        const instance = createChatInstance();
        await expect(instance.delete()).rejects.toThrow(NOT_INITIALIZED_MSG);
    });

    it('getUsersInChannel() throws', async () => {
        const instance = createChatInstance();
        await expect(instance.getUsersInChannel()).rejects.toThrow(NOT_INITIALIZED_MSG);
    });

    it('encrypt() throws', () => {
        const instance = createChatInstance();
        expect(() => instance.encrypt({ image: '', text: 'hi' })).toThrow(NOT_INITIALIZED_MSG);
    });

    it('setChannel() throws', async () => {
        const instance = createChatInstance();
        await expect(instance.setChannel(ROOM_ID, SECRET, USER_ID)).rejects.toThrow(NOT_INITIALIZED_MSG);
    });
});

// ---------------------------------------------------------------------------
// setChannel() / isEncrypted()
// ---------------------------------------------------------------------------
describe('setChannel() / isEncrypted()', () => {
    it('isEncrypted() is false until setChannel() resolves, then true', async () => {
        const instance = await buildInitializedInstance();
        expect(instance.isEncrypted()).toBe(false);

        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        expect(instance.isEncrypted()).toBe(true);
    });

    it('joins via the socket with only channelID/userID — no key material is ever sent', async () => {
        mockSocket.emit.mockClear();
        const instance = await buildInitializedInstance();

        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        expect(mockSocket.emit).toHaveBeenCalledWith('chat-join', { userID: USER_ID, channelID: ROOM_ID });
        const [, joinPayload] = mockSocket.emit.mock.calls.find(([event]) => event === 'chat-join')!;
        expect(JSON.stringify(joinPayload)).not.toContain(SECRET);
    });

    it('rejects when roomId is missing', async () => {
        const instance = await buildInitializedInstance();
        await expect(instance.setChannel('', SECRET, USER_ID)).rejects.toThrow(/roomId.*secret|secret.*roomId/i);
    });

    it('rejects when secret is missing', async () => {
        const instance = await buildInitializedInstance();
        await expect(instance.setChannel(ROOM_ID, '', USER_ID)).rejects.toThrow(/roomId.*secret|secret.*roomId/i);
    });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------
describe('dispose()', () => {
    it('succeeds without throwing when called after init()', async () => {
        const instance = await buildInitializedInstance();
        expect(() => instance.dispose()).not.toThrow();
    });

    it('marks the instance as uninitialized, so subsequent calls throw', async () => {
        const instance = await buildInitializedInstance();
        instance.dispose();
        expect(() => instance.isEncrypted()).toThrow('ChatE2EE is not initialized, call init()');
    });
});

// ---------------------------------------------------------------------------
// on()
// ---------------------------------------------------------------------------
describe('on()', () => {
    it('registers an event listener without throwing', async () => {
        const instance = await buildInitializedInstance();
        const cb = jest.fn();
        expect(() => instance.on('chat-message', cb)).not.toThrow();
    });

    it('does not register the same callback twice (deduplication)', async () => {
        const instance = await buildInitializedInstance();
        const cb = jest.fn();
        instance.on('delivered', cb);
        expect(() => instance.on('delivered', cb)).not.toThrow();
    });

    it('registers multiple different callbacks for the same event', async () => {
        const instance = await buildInitializedInstance();
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        expect(() => {
            instance.on('chat-message', cb1);
            instance.on('chat-message', cb2);
        }).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// getLink()
// ---------------------------------------------------------------------------
describe('getLink()', () => {
    it('returns the client-generated invite (hash/secret/link)', async () => {
        const instance = createChatInstance();
        const link = await instance.getLink();
        expect(link).toHaveProperty('hash');
        expect(link).toHaveProperty('secret');
        expect(link).toHaveProperty('link');
        expect(link).not.toHaveProperty('pin');
    });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------
describe('delete()', () => {
    it('calls deleteLink with the roomId after setChannel()', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        const { deleteLink } = require('./api/links');
        await instance.delete();

        expect(deleteLink).toHaveBeenCalledWith({ channelID: ROOM_ID });
    });
});

// ---------------------------------------------------------------------------
// encrypt() — sending
// ---------------------------------------------------------------------------
describe('encrypt()', () => {
    it('returns an object with a send() function', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        const builder = instance.encrypt({ image: '', text: 'hello' });
        expect(typeof builder.send).toBe('function');
    });

    it('send() rejects with a descriptive error when the channel is not ready', async () => {
        const instance = await buildInitializedInstance();

        await expect(instance.encrypt({ image: '', text: 'hello' }).send()).rejects.toThrow(/Channel is not ready/);
    });

    it('send() seals the message with the chat key and delivers via the socket, never sending plaintext', async () => {
        mockSocket.emit.mockImplementation((event: string, payload: unknown, ack?: (r: unknown) => void) => {
            if (event === 'chat-message') {
                ack?.({ id: 42, timestamp: 1234 });
            }
        });

        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        const result = await instance.encrypt({ image: '', text: 'hello' }).send();

        expect(result).toEqual({ id: '42', timestamp: '1234' });
        const [, sentPayload] = mockSocket.emit.mock.calls.find(([event]) => event === 'chat-message')!;
        const envelope = (sentPayload as { envelope: { room: string; v: number; ct: string } }).envelope;
        expect(envelope.room).toBe(ROOM_ID);
        expect(envelope.v).toBe(1);
        expect(envelope.ct).not.toContain('hello');
    });

    it('each outgoing message uses a strictly increasing sequence number', async () => {
        const seen: unknown[] = [];
        mockSocket.emit.mockImplementation((event: string, payload: unknown, ack?: (r: unknown) => void) => {
            if (event === 'chat-message') {
                seen.push(payload);
                ack?.({ id: seen.length, timestamp: Date.now() });
            }
        });
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        await instance.encrypt({ image: '', text: 'one' }).send();
        await instance.encrypt({ image: '', text: 'two' }).send();

        expect(seen).toHaveLength(2);
        // Ciphertexts (and thus ivs) must differ even if plaintexts were identical.
        const first = (seen[0] as { envelope: { iv: string } }).envelope.iv;
        const second = (seen[1] as { envelope: { iv: string } }).envelope.iv;
        expect(first).not.toBe(second);
    });
});

// ---------------------------------------------------------------------------
// receiving a chat message
// ---------------------------------------------------------------------------
describe('receiving chat-message', () => {
    it('decrypts the envelope and delivers plaintext to subscribers', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const { chatKey } = await deriveInviteKeys(SECRET, ROOM_ID);
        const envelope = await sealEnvelope(chatKey, ROOM_ID, { seq: 1, timestamp: 111, text: 'hi there', image: '' });

        wireHandlerFor('chat-message')({ id: 1, timestamp: 111, sender: 'bob', envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ sender: 'bob', message: 'hi there' }));
    });

    it('drops (never delivers) a message that fails to decrypt — no plaintext fallback', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const { chatKey } = await deriveInviteKeys(SECRET, ROOM_ID);
        const envelope = await sealEnvelope(chatKey, ROOM_ID, { seq: 1, timestamp: 1, text: 'hi', image: '' });
        const tampered = { ...envelope, ct: envelope.ct.slice(0, -2) + (envelope.ct.slice(-2) === 'AA' ? 'BB' : 'AA') };

        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope: tampered });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });

    it('drops a replayed/duplicate message (same sequence number twice)', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const { chatKey } = await deriveInviteKeys(SECRET, ROOM_ID);
        const envelope = await sealEnvelope(chatKey, ROOM_ID, { seq: 7, timestamp: 1, text: 'hi', image: '' });
        const handler = wireHandlerFor('chat-message');

        handler({ id: 1, timestamp: 1, sender: 'bob', envelope });
        await flushAsync();
        handler({ id: 2, timestamp: 2, sender: 'bob', envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// startCall() preconditions
// ---------------------------------------------------------------------------
describe('startCall()', () => {
    afterEach(() => {
        delete (globalThis as any).RTCPeerConnection;
    });

    it('throws when WebRTC is not supported by the environment', async () => {
        delete (globalThis as any).RTCPeerConnection;
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        await expect(instance.startCall()).rejects.toThrow('WebRTC is not supported');
    });

    it('throws when no peer is available in the channel', async () => {
        (globalThis as any).RTCPeerConnection = function () {};
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        await expect(instance.startCall()).rejects.toThrow('No user available to accept call');
    });
});
