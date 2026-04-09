/**
 * Tests for ECDHEncryption — X25519 ECDH key exchange + AES-256-GCM.
 *
 * Polyfills mirror the setup in crypto.test.ts so tests run correctly
 * in both Node.js and browser environments.
 */

import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { ECDHEncryption } from './cryptoecdh';
import { EncryptionFactory } from './encryptionFactory';

// ---------------------------------------------------------------------------
// ECDHEncryption unit tests
// ---------------------------------------------------------------------------
describe('ECDHEncryption (ECDH X25519 + AES-256-GCM) – real Web Crypto', () => {

    it('init() generates a key pair and is idempotent on subsequent calls', async () => {
        const ecdh = new ECDHEncryption();
        await ecdh.init();
        await ecdh.init(); // second call should be a no-op, not throw
    });

    it('exportKey() returns a non-empty JWK string after init()', async () => {
        const ecdh = new ECDHEncryption();
        await ecdh.init();

        const exported = await ecdh.exportKey();
        expect(typeof exported).toBe('string');
        expect(exported.length).toBeGreaterThan(0);

        // Must be valid JSON (JWK)
        const parsed = JSON.parse(exported);
        expect(parsed.kty).toBe('OKP');        // Octet Key Pair — X25519
        expect(parsed.crv).toBe('X25519');
        expect(parsed.d).toBeUndefined();      // Public key only — no private material
    });

    it('exportKey() throws before init()', async () => {
        const ecdh = new ECDHEncryption();
        await expect(ecdh.exportKey()).rejects.toThrow('init()');
    });

    it('encryptData() throws before importRemoteKey()', async () => {
        const ecdh = new ECDHEncryption();
        await ecdh.init();
        const data = new TextEncoder().encode('test').buffer;
        await expect(ecdh.encryptData(data)).rejects.toThrow('importRemoteKey()');
    });

    it('decryptData() throws before importRemoteKey()', async () => {
        const ecdh = new ECDHEncryption();
        await ecdh.init();
        const dummy = new Uint8Array(12);
        await expect(ecdh.decryptData(dummy, dummy)).rejects.toThrow('importRemoteKey()');
    });

    it('Alice and Bob derive the same shared key and can encrypt/decrypt', async () => {
        const alice = new ECDHEncryption();
        const bob   = new ECDHEncryption();

        await alice.init();
        await bob.init();

        // Exchange public keys
        const alicePub = await alice.exportKey();
        const bobPub   = await bob.exportKey();

        await alice.importRemoteKey(bobPub);
        await bob.importRemoteKey(alicePub);

        // Alice encrypts → Bob decrypts
        const plaintext = 'Hello from Alice!';
        const { encryptedData, iv } = await alice.encryptData(
            new TextEncoder().encode(plaintext).buffer
        );
        const decrypted = await bob.decryptData(encryptedData, iv);
        expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
    });

    it('Bob encrypts → Alice decrypts (bidirectional)', async () => {
        const alice = new ECDHEncryption();
        const bob   = new ECDHEncryption();

        await alice.init();
        await bob.init();

        const alicePub = await alice.exportKey();
        const bobPub   = await bob.exportKey();

        await alice.importRemoteKey(bobPub);
        await bob.importRemoteKey(alicePub);

        const plaintext = 'Hello from Bob!';
        const { encryptedData, iv } = await bob.encryptData(
            new TextEncoder().encode(plaintext).buffer
        );
        const decrypted = await alice.decryptData(encryptedData, iv);
        expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
    });

    it('different sessions produce different public keys', async () => {
        const session1 = new ECDHEncryption();
        const session2 = new ECDHEncryption();

        await session1.init();
        await session2.init();

        const key1 = await session1.exportKey();
        const key2 = await session2.exportKey();

        expect(key1).not.toBe(key2);
    });

    it('each encryptData() call produces a unique IV', async () => {
        const alice = new ECDHEncryption();
        const bob   = new ECDHEncryption();

        await alice.init();
        await bob.init();

        await alice.importRemoteKey(await bob.exportKey());

        const data = new TextEncoder().encode('same message').buffer;
        const result1 = await alice.encryptData(data);
        const result2 = await alice.encryptData(data);

        // IVs must differ — same IV reuse with AES-GCM breaks security
        expect(Buffer.from(result1.iv).toString('hex'))
            .not.toBe(Buffer.from(result2.iv).toString('hex'));
    });

    it('tampered ciphertext fails decryption (GCM auth tag check)', async () => {
        const alice = new ECDHEncryption();
        const bob   = new ECDHEncryption();

        await alice.init();
        await bob.init();

        await alice.importRemoteKey(await bob.exportKey());
        await bob.importRemoteKey(await alice.exportKey());

        const { encryptedData, iv } = await alice.encryptData(
            new TextEncoder().encode('secret').buffer
        );

        // Flip one byte to simulate tampering
        encryptedData[0] ^= 0xff;

        await expect(bob.decryptData(encryptedData, iv)).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// EncryptionFactory integration
// ---------------------------------------------------------------------------
describe('ECDHEncryption – EncryptionFactory integration', () => {

    beforeAll(() => {
        EncryptionFactory.registerSymmetric('ECDH-X25519', () => new ECDHEncryption());
    });

    it('registers and resolves via EncryptionFactory', () => {
        const strategy = EncryptionFactory.create({ symmetric: 'ECDH-X25519' });
        expect(strategy.symmetric).toBeInstanceOf(ECDHEncryption);
    });

    it('full ECDH handshake works through EncryptionFactory', async () => {
        const aliceStrategy = EncryptionFactory.create({ symmetric: 'ECDH-X25519' });
        const bobStrategy   = EncryptionFactory.create({ symmetric: 'ECDH-X25519' });

        await aliceStrategy.symmetric.init();
        await bobStrategy.symmetric.init();

        const alicePub = await aliceStrategy.symmetric.exportKey();
        const bobPub   = await bobStrategy.symmetric.exportKey();

        await aliceStrategy.symmetric.importRemoteKey(bobPub);
        await bobStrategy.symmetric.importRemoteKey(alicePub);

        const plaintext = 'end-to-end via ECDH factory';
        const { encryptedData, iv } = await aliceStrategy.symmetric.encryptData(
            new TextEncoder().encode(plaintext).buffer
        );
        const decrypted = await bobStrategy.symmetric.decryptData(encryptedData, iv);

        expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
    });
});
