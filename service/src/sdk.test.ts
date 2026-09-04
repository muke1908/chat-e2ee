import { webcrypto } from 'crypto';

// Polyfill for Node versions < 19 that do not expose globalThis.crypto
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// inviteCrypto/crypto strategies access `window.crypto`, `window.btoa`, and
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
import { generateInviteSecret, deriveChannelSecrets } from './crypto/inviteCrypto';
import { getEncryptionStrategy, DEFAULT_ENCRYPTION_STRATEGY_ID, NO_ENCRYPTION_STRATEGY_ID, registerEncryptionStrategy, unregisterEncryptionStrategy } from './crypto/registry';
import type { EncryptionEnvelope, EncryptionStrategyFactory } from './crypto/strategy';

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

/** Mirrors the private JSON<->bytes serialization `ChatE2EE` uses around every `EncryptionStrategy`. */
const encodePayload = (payload: unknown): ArrayBuffer => new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer;
const decodePayload = <T>(bytes: ArrayBuffer): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

/**
 * Builds a wire-shaped envelope exactly the way the real default strategy
 * (registered under `DEFAULT_ENCRYPTION_STRATEGY_ID`) would, for tests that
 * simulate an incoming message from a peer without going through a second
 * full `ChatE2EE` instance. Domain separation between `'chat'` and
 * `'signaling'` happens entirely outside the strategy, exactly as `ChatE2EE`
 * itself does it: a fresh strategy instance is initialized with the secret
 * derived for that specific channel.
 */
async function sealWithDefaultStrategy(channel: 'chat' | 'signaling', payload: unknown): Promise<EncryptionEnvelope> {
    const strategy = getEncryptionStrategy(DEFAULT_ENCRYPTION_STRATEGY_ID);
    const { chatSecret, signalingSecret } = await deriveChannelSecrets(SECRET);
    await strategy.initialize(channel === 'chat' ? chatSecret : signalingSecret);
    return strategy.encrypt(encodePayload(payload));
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
        expect(typeof instance.restartIce).toBe('function');
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

    it('succeeds even if setChannel() was never called (strategies were never initialized)', async () => {
        const instance = await buildInitializedInstance();
        expect(() => instance.dispose()).not.toThrow();
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

    it('send() seals the message with the chat strategy and delivers via the socket into a { version, strategy, data } envelope, never sending plaintext', async () => {
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
        const envelope = (sentPayload as { envelope: EncryptionEnvelope & { data: { ct: string } } }).envelope;
        expect(Object.keys(envelope).sort()).toEqual(['data', 'strategy', 'version']);
        expect(envelope.version).toBe(1);
        expect(envelope.strategy).toBe(DEFAULT_ENCRYPTION_STRATEGY_ID);
        expect(envelope.data.ct).not.toContain('hello');
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
        const first = (seen[0] as { envelope: { data: { iv: string } } }).envelope.data.iv;
        const second = (seen[1] as { envelope: { data: { iv: string } } }).envelope.data.iv;
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

        const envelope = await sealWithDefaultStrategy('chat', { seq: 1, timestamp: 111, text: 'hi there', image: '' });

        wireHandlerFor('chat-message')({ id: 1, timestamp: 111, sender: 'bob', envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ sender: 'bob', message: 'hi there' }));
    });

    it('drops (never delivers) a message that fails to decrypt — no plaintext fallback', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const envelope = await sealWithDefaultStrategy('chat', { seq: 1, timestamp: 1, text: 'hi', image: '' });
        const data = envelope.data as { iv: string; ct: string };
        const tampered = { ...envelope, data: { ...data, ct: data.ct.slice(0, -2) + (data.ct.slice(-2) === 'AA' ? 'BB' : 'AA') } };

        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope: tampered });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });

    it('drops a replayed/duplicate message (same sequence number twice)', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const envelope = await sealWithDefaultStrategy('chat', { seq: 7, timestamp: 1, text: 'hi', image: '' });
        const handler = wireHandlerFor('chat-message');

        handler({ id: 1, timestamp: 1, sender: 'bob', envelope });
        await flushAsync();
        handler({ id: 2, timestamp: 2, sender: 'bob', envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('drops an envelope produced by a different encryption strategy (no cross-strategy fallback)', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const envelope = await sealWithDefaultStrategy('chat', { seq: 1, timestamp: 1, text: 'hi', image: '' });
        const mismatched = { ...envelope, strategy: 'not-the-configured-strategy' };

        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope: mismatched });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });

    it('drops an envelope sealed for the wrong logical channel (signaling secret used for a chat message) — domain separation holds even within the same room', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        // Sealed with the *signaling* secret, but delivered as a chat-message.
        const envelope = await sealWithDefaultStrategy('signaling', { seq: 1, timestamp: 1, text: 'hi', image: '' });

        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// receiving a webrtc signal
// ---------------------------------------------------------------------------
describe('receiving webrtc signal', () => {
    it('decrypts the envelope and delivers it to call-invite subscribers', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('call-invite', cb);

        const envelope = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-1', seq: 1, timestamp: 1 });

        wireHandlerFor('webrtc-session-description')({ envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ callId: 'call-1' }));
    });

    it('drops a replayed/duplicate signal (same sequence number twice for the same call)', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('call-invite', cb);

        const envelope = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-1', seq: 5, timestamp: 1 });
        const handler = wireHandlerFor('webrtc-session-description');

        handler({ envelope });
        await flushAsync();
        handler({ envelope });
        await flushAsync();

        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('drops an out-of-order/lower sequence number signal for the same call', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('call-invite', cb);
        const handler = wireHandlerFor('webrtc-session-description');

        const newer = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-1', seq: 5, timestamp: 1 });
        const older = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-1', seq: 3, timestamp: 1 });

        handler({ envelope: newer });
        await flushAsync();
        handler({ envelope: older });
        await flushAsync();

        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not drop a signal for a different call id, even with a lower/equal sequence number', async () => {
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('call-invite', cb);
        const handler = wireHandlerFor('webrtc-session-description');

        const callOne = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-1', seq: 5, timestamp: 1 });
        const callTwo = await sealWithDefaultStrategy('signaling', { type: 'call-invite', callId: 'call-2', seq: 1, timestamp: 1 });

        handler({ envelope: callOne });
        await flushAsync();
        handler({ envelope: callTwo });
        await flushAsync();

        expect(cb).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// createChatInstance() encryption strategy selection
// ---------------------------------------------------------------------------
/** Minimal custom strategy factory used to prove the registry/factory is genuinely pluggable (not just secure-vs-disabled). It knows nothing about rooms/channels/payload shape — only opaque bytes. */
const CUSTOM_STRATEGY_ID = 'test-reverse-base64-strategy';
const buildCustomStrategyFactory: EncryptionStrategyFactory = () => {
    let ready = false;
    return {
        id: CUSTOM_STRATEGY_ID,
        encrypted: true,
        async initialize() {
            ready = true;
        },
        async encrypt(data: ArrayBuffer): Promise<EncryptionEnvelope> {
            if (!ready) {
                throw new Error('not initialized');
            }
            const obfuscated = Buffer.from(data).toString('base64').split('').reverse().join('');
            return { version: 1, strategy: CUSTOM_STRATEGY_ID, data: obfuscated };
        },
        async decrypt(envelope: EncryptionEnvelope): Promise<ArrayBuffer> {
            if (!ready) {
                throw new Error('not initialized');
            }
            if (envelope.version !== 1) {
                throw new Error(`Unsupported envelope version: ${String(envelope.version)}`);
            }
            if (envelope.strategy !== CUSTOM_STRATEGY_ID) {
                throw new Error(`Unsupported encryption strategy: expected "${CUSTOM_STRATEGY_ID}", got "${String(envelope.strategy)}".`);
            }
            const restored = (envelope.data as string).split('').reverse().join('');
            return Uint8Array.from(Buffer.from(restored, 'base64')).buffer as ArrayBuffer;
        },
        destroy() {
            ready = false;
        },
    };
};

describe('createChatInstance() encryption strategy selection', () => {
    afterEach(() => {
        unregisterEncryptionStrategy(CUSTOM_STRATEGY_ID);
    });

    it('defaults to the secure AES-256-GCM strategy when unconfigured', async () => {
        mockSocket.emit.mockClear();
        mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (r: unknown) => void) => {
            if (event === 'chat-message') ack?.({ id: 1, timestamp: 1 });
        });
        const instance = await buildInitializedInstance();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        expect(instance.isEncrypted()).toBe(true);

        await instance.encrypt({ image: '', text: 'hello' }).send();
        const [, sentPayload] = mockSocket.emit.mock.calls.find(([event]) => event === 'chat-message')!;
        expect((sentPayload as { envelope: { strategy: string } }).envelope.strategy).toBe(DEFAULT_ENCRYPTION_STRATEGY_ID);
        expect(DEFAULT_ENCRYPTION_STRATEGY_ID).toBe(getEncryptionStrategy(DEFAULT_ENCRYPTION_STRATEGY_ID).id);
    });

    it('uses a custom strategy registered via registerEncryptionStrategy(), selected by id', async () => {
        registerEncryptionStrategy(CUSTOM_STRATEGY_ID, buildCustomStrategyFactory);
        mockSocket.emit.mockClear();
        mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (r: unknown) => void) => {
            if (event === 'chat-message') ack?.({ id: 1, timestamp: 1 });
        });

        const instance = createChatInstance({ encryption: { strategy: CUSTOM_STRATEGY_ID } });
        await instance.init();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        expect(instance.isEncrypted()).toBe(true);

        const cb = jest.fn();
        instance.on('chat-message', cb);

        await instance.encrypt({ image: '', text: 'via custom strategy' }).send();
        const [, sentPayload] = mockSocket.emit.mock.calls.find(([event]) => event === 'chat-message')!;
        const envelope = (sentPayload as { envelope: { strategy: string; data: string } }).envelope;
        expect(envelope.strategy).toBe(CUSTOM_STRATEGY_ID);
        expect(envelope.data).not.toContain('via custom strategy');

        // Round-trip a message "from the peer" through the same custom strategy.
        const strategy = getEncryptionStrategy(CUSTOM_STRATEGY_ID);
        await strategy.initialize('unused-secret-custom-strategy-ignores-it');
        const incoming = await strategy.encrypt(encodePayload({ seq: 1, timestamp: 1, text: 'hi from peer', image: '' }));
        wireHandlerFor('chat-message')({ id: 2, timestamp: 2, sender: 'bob', envelope: incoming });
        await flushAsync();
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'hi from peer' }));
    });

    it('accepts an ad-hoc custom strategy factory without requiring global registration, and calls it twice for distinct chat/signaling instances', async () => {
        const factory = jest.fn(buildCustomStrategyFactory);
        const instance = createChatInstance({ encryption: { strategy: factory } });
        await instance.init();
        await expect(instance.setChannel(ROOM_ID, SECRET, USER_ID)).resolves.toBeUndefined();
        expect(instance.isEncrypted()).toBe(true);
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it('supports the built-in disabled/no-encryption strategy, using versioned envelopes with base64url-encoded plaintext', async () => {
        mockSocket.emit.mockClear();
        mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (r: unknown) => void) => {
            if (event === 'chat-message') ack?.({ id: 1, timestamp: 1 });
        });
        const instance = createChatInstance({ encryption: { strategy: NO_ENCRYPTION_STRATEGY_ID } });
        await instance.init();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);

        // isEncrypted() must report false even though the channel is ready.
        expect(instance.isEncrypted()).toBe(false);

        const cb = jest.fn();
        instance.on('chat-message', cb);

        await instance.encrypt({ image: '', text: 'plaintext hello' }).send();
        const [, sentPayload] = mockSocket.emit.mock.calls.find(([event]) => event === 'chat-message')!;
        const envelope = (sentPayload as { envelope: { strategy: string; version: number; data: string } }).envelope;
        expect(Object.keys(envelope).sort()).toEqual(['data', 'strategy', 'version']);
        expect(envelope.strategy).toBe(NO_ENCRYPTION_STRATEGY_ID);
        expect(envelope.version).toBe(1);
        const decoded = decodePayload<{ text: string }>(Uint8Array.from(Buffer.from(envelope.data, 'base64url')).buffer as ArrayBuffer);
        expect(decoded.text).toBe('plaintext hello'); // intentionally plaintext, never ciphertext

        // Still round-trips normally end-to-end.
        wireHandlerFor('chat-message')({ id: 2, timestamp: 2, sender: 'bob', envelope });
        await flushAsync();
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'plaintext hello' }));
    });

    it('disabled strategy rejects an envelope with an unsupported protocol version (no silent fallback)', async () => {
        const instance = createChatInstance({ encryption: { strategy: NO_ENCRYPTION_STRATEGY_ID } });
        await instance.init();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const envelope = await sealWithDefaultStrategy('chat', { seq: 1, timestamp: 1, text: 'hi', image: '' });
        const tampered = { version: 99, strategy: NO_ENCRYPTION_STRATEGY_ID, data: envelope.data };
        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope: tampered });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });

    it('rejects an envelope sealed by the secure strategy when configured for disabled mode (no cross-mode fallback)', async () => {
        const instance = createChatInstance({ encryption: { strategy: NO_ENCRYPTION_STRATEGY_ID } });
        await instance.init();
        await instance.setChannel(ROOM_ID, SECRET, USER_ID);
        const cb = jest.fn();
        instance.on('chat-message', cb);

        const secureEnvelope = await sealWithDefaultStrategy('chat', { seq: 1, timestamp: 1, text: 'hi', image: '' });
        wireHandlerFor('chat-message')({ id: 1, timestamp: 1, sender: 'bob', envelope: secureEnvelope });
        await flushAsync();

        expect(cb).not.toHaveBeenCalled();
    });

    it('throws immediately (fails fast, not lazily at setChannel time) for an unknown strategy id', () => {
        expect(() => createChatInstance({ encryption: { strategy: 'this-strategy-does-not-exist' } })).toThrow(
            /Unknown encryption strategy/,
        );
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
