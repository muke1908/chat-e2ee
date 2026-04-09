/**
 * Crypto tests using the real Web Crypto API.
 *
 * Node 19+ exposes `globalThis.crypto.subtle` natively.
 * The production code accesses crypto via `window.crypto`, so we alias
 * `globalThis.window` to `globalThis` once before all tests so that
 * `window.crypto`, `window.btoa`, and `window.atob` resolve correctly
 * without any mocking.
 */

import { webcrypto } from 'crypto';

// Polyfill for Node versions < 19 that do not expose globalThis.crypto
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// cryptoRSA.ts accesses `window.crypto`, `window.btoa`, and `window.atob`.
// In a Node (non-jsdom) environment `window` is undefined, so we point it at
// globalThis which already has btoa/atob (Node 16+) and crypto (Node 19+).
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { cryptoUtils } from './cryptoRSA';
import { AesGcmEncryption } from './cryptoAES';

// ---------------------------------------------------------------------------
// RSA round-trip tests
// ---------------------------------------------------------------------------
describe('cryptoUtils (RSA-OAEP) – real Web Crypto', () => {
    it('generateKeypairs() returns non-empty serialised public and private keys', async () => {
        const keyPair = await cryptoUtils.generateKeypairs();

        expect(typeof keyPair.publicKey).toBe('string');
        expect(typeof keyPair.privateKey).toBe('string');
        expect(keyPair.publicKey.length).toBeGreaterThan(0);
        expect(keyPair.privateKey.length).toBeGreaterThan(0);

        // Keys should be valid JSON (JWK format wrapped in JSON.stringify)
        expect(() => JSON.parse(keyPair.publicKey)).not.toThrow();
        expect(() => JSON.parse(keyPair.privateKey)).not.toThrow();
    });

    it('encryptMessage() + decryptMessage() recover the original plaintext', async () => {
        const plaintext = 'Hello, end-to-end encryption!';

        const { publicKey, privateKey } = await cryptoUtils.generateKeypairs();

        const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);
        expect(typeof ciphertext).toBe('string');
        expect(ciphertext).not.toBe(plaintext);

        const recovered = await cryptoUtils.decryptMessage(ciphertext, privateKey);
        expect(recovered).toBe(plaintext);
    });

    it('decryptMessage() fails when using the wrong private key', async () => {
        const plaintext = 'Secret message';

        const { publicKey } = await cryptoUtils.generateKeypairs();
        const { privateKey: wrongPrivateKey } = await cryptoUtils.generateKeypairs();

        const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);

        await expect(
            cryptoUtils.decryptMessage(ciphertext, wrongPrivateKey)
        ).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// AES-GCM round-trip tests
// ---------------------------------------------------------------------------
describe('AesGcmEncryption (AES-GCM) – real Web Crypto', () => {
    it('init() generates ECDH key pair and is idempotent on subsequent calls', async () => {
        const aes = new AesGcmEncryption();
        await aes.init();
        const key1Export = await aes.exportKey();
        await aes.init();
        const key2Export = await aes.exportKey();

        expect(key1Export).toBeDefined();
        // Second call should return the same cached instance
        expect(key1Export).toBe(key2Export);
    });

    it('encryptData() + decryptData() recover the original data', async () => {
        const aes = new AesGcmEncryption();

        // Initialise the local key (used for encryption)
        await aes.init();

        // Export the local ECDH public key and set it as the "remote" key to derive shared key for loopback test
        const exportedKey = await aes.exportKey();
        await aes.importRemoteKey(exportedKey);

        const originalText = 'AES test payload 🔒';
        const originalData = new TextEncoder().encode(originalText).buffer;

        const { encryptedData, iv } = await aes.encryptData(originalData);

        expect(encryptedData).toBeInstanceOf(Uint8Array);
        expect(iv).toBeInstanceOf(Uint8Array);
        expect(iv.length).toBe(12); // AES-GCM IV is 12 bytes

        const decryptedBuffer = await aes.decryptData(encryptedData, iv);
        const decryptedText = new TextDecoder().decode(decryptedBuffer);

        expect(decryptedText).toBe(originalText);
    });

    it('encryptData() and decryptData() throw before initialisation/key import', async () => {
        const aes = new AesGcmEncryption();

        // No init() call → should throw for encrypt
        await expect(aes.encryptData(
            new TextEncoder().encode('data').buffer
        )).rejects.toThrow('Local AES key not generated.');

        await aes.init();

        // No importRemoteKey() call → should throw for decrypt
        await expect(aes.decryptData(new ArrayBuffer(10), new Uint8Array(12))).rejects.toThrow(
            'Remote AES key not set.'
        );
    });
});

// ---------------------------------------------------------------------------
// ECDH symmetric key exchange
// ---------------------------------------------------------------------------
describe('ECDH symmetric key exchange', () => {
    it('ECDH public key exported by sender can be used by receiver to derive same AES key', async () => {
        // Simulate Bob (receiver)
        const bobAes = new AesGcmEncryption();
        await bobAes.init();
        const bobEcdhKeyJwk = await bobAes.exportKey();

        // Simulate Alice (sender)
        const aliceAes = new AesGcmEncryption();
        await aliceAes.init();
        const aliceEcdhKeyJwk = await aliceAes.exportKey();

        // Exchange keys (in plaintext over the wire)
        await aliceAes.importRemoteKey(bobEcdhKeyJwk);
        await bobAes.importRemoteKey(aliceEcdhKeyJwk);

        // Alice encrypts some data with her derived AES key
        const originalText = 'Secret message over ECDH derived AES-GCM 🔐';
        const { encryptedData, iv } = await aliceAes.encryptData(
            new TextEncoder().encode(originalText).buffer
        );

        // Bob decrypts the data using his derived AES key
        const decryptedBuffer = await bobAes.decryptData(encryptedData, iv);
        const decryptedText = new TextDecoder().decode(decryptedBuffer);

        expect(decryptedText).toBe(originalText);
    });
});
