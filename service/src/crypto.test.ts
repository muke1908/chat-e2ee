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
    it('int() generates a CryptoKey and returns it on subsequent calls', async () => {
        const aes = new AesGcmEncryption();
        const key1 = await aes.int();
        const key2 = await aes.int();

        expect(key1).toBeDefined();
        // Second call should return the same cached instance
        expect(key1).toBe(key2);
    });

    it('encryptData() + decryptData() recover the original data', async () => {
        const aes = new AesGcmEncryption();

        // Initialise the local key (used for encryption)
        await aes.int();

        // Export the local key and re-import it as the "remote" key so that
        // decryptData() (which uses aesKeyRemote) can decrypt what encryptData()
        // produced.
        const exportedKey = await aes.getRawAesKeyToExport();
        await aes.setRemoteAesKey(exportedKey);

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

    it('decryptData() throws when remote key has not been set', async () => {
        const aes = new AesGcmEncryption();
        await aes.int();

        const { encryptedData, iv } = await aes.encryptData(
            new TextEncoder().encode('data').buffer
        );

        // No setRemoteAesKey() call → should throw
        await expect(aes.decryptData(encryptedData, iv)).rejects.toThrow(
            'Remote AES key not set.'
        );
    });
});
