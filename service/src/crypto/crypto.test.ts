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
    it('init() generates the key and is idempotent on subsequent calls', async () => {
        const aes = new AesGcmEncryption();
        await aes.init();
        await aes.init(); // Should not throw or regenerate

        // Verify the key exists and is exportable
        const exported = await aes.exportKey();
        expect(typeof exported).toBe('string');
        expect(exported.length).toBeGreaterThan(0);
    });

    it('encryptData() + decryptData() recover the original data', async () => {
        const aes = new AesGcmEncryption();

        // Initialise the local key (used for encryption)
        await aes.init();

        // Export the local key and re-import it as the "remote" key so that
        // decryptData() (which uses aesKeyRemote) can decrypt what encryptData()
        // produced.
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

    it('decryptData() throws when remote key has not been set', async () => {
        const aes = new AesGcmEncryption();
        await aes.init();

        const { encryptedData, iv } = await aes.encryptData(
            new TextEncoder().encode('data').buffer
        );

        // No importRemoteKey() call → should throw
        await expect(aes.decryptData(encryptedData, iv)).rejects.toThrow(
            'Remote AES key not set.'
        );
    });
});

// ---------------------------------------------------------------------------
// AES key exchange via RSA-encrypted channel
// ---------------------------------------------------------------------------
describe('AES key exchange via RSA-encrypted channel', () => {
    it('AES key exported by sender can be RSA-encrypted and decrypted by receiver, enabling symmetric decryption', async () => {
        // Simulate Bob (receiver): generate an RSA key pair
        const { publicKey: bobPublicKey, privateKey: bobPrivateKey } = await cryptoUtils.generateKeypairs();

        // Simulate Alice (sender): generate an AES key
        const aliceAes = new AesGcmEncryption();
        await aliceAes.init();

        // Alice exports her AES key as a JWK string
        const aesKeyJwk = await aliceAes.exportKey();

        // Alice encrypts the AES key with Bob's RSA public key before sending it to the server
        const encryptedAesKey = await cryptoUtils.encryptMessage(aesKeyJwk, bobPublicKey);
        expect(typeof encryptedAesKey).toBe('string');
        expect(encryptedAesKey).not.toBe(aesKeyJwk); // must be ciphertext, not plaintext

        // Bob decrypts the AES key using his RSA private key
        const decryptedAesKeyJwk = await cryptoUtils.decryptMessage(encryptedAesKey, bobPrivateKey);
        expect(decryptedAesKeyJwk).toBe(aesKeyJwk); // recovered plaintext must match original

        // Bob sets the decrypted AES key as his remote key
        const bobAes = new AesGcmEncryption();
        await bobAes.importRemoteKey(decryptedAesKeyJwk);

        // Alice encrypts some data with her local AES key
        const originalText = 'Secret message over AES-GCM 🔐';
        const { encryptedData, iv } = await aliceAes.encryptData(
            new TextEncoder().encode(originalText).buffer
        );

        // Bob decrypts the data using the AES key he received through the RSA-encrypted channel
        const decryptedBuffer = await bobAes.decryptData(encryptedData, iv);
        const decryptedText = new TextDecoder().decode(decryptedBuffer);

        expect(decryptedText).toBe(originalText);
    });

    it('a third party cannot decrypt the AES key without the receiver private key', async () => {
        const { publicKey: bobPublicKey } = await cryptoUtils.generateKeypairs();
        const { privateKey: evePrivateKey } = await cryptoUtils.generateKeypairs(); // attacker's key

        const aliceAes = new AesGcmEncryption();
        await aliceAes.init();
        const aesKeyJwk = await aliceAes.exportKey();

        // Alice encrypts AES key with Bob's public key
        const encryptedAesKey = await cryptoUtils.encryptMessage(aesKeyJwk, bobPublicKey);

        // Eve (third party) tries to decrypt with her own private key and fails
        await expect(
            cryptoUtils.decryptMessage(encryptedAesKey, evePrivateKey)
        ).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// EncryptionFactory
// ---------------------------------------------------------------------------
describe('EncryptionFactory', () => {
    // Import inside the describe so the window polyfill above is already set up
    const { EncryptionFactory } = require('./encryptionFactory');
    const { AesGcmEncryption } = require('./cryptoAES');

    it('create() with no args returns an object with symmetric and asymmetric strategies', () => {
        const strategy = EncryptionFactory.create();
        expect(strategy.symmetric).toBeDefined();
        expect(strategy.asymmetric).toBeDefined();
    });

    it('create() returns a fresh symmetric instance on each call (stateful key material)', () => {
        const a = EncryptionFactory.create();
        const b = EncryptionFactory.create();
        // Symmetric strategy holds key state — must be a distinct instance each time
        expect(a.symmetric).not.toBe(b.symmetric);
    });

    it('create({ symmetric: "AES-GCM" }) returns an AesGcmEncryption instance', () => {
        const { symmetric } = EncryptionFactory.create({ symmetric: 'AES-GCM' });
        expect(symmetric).toBeInstanceOf(AesGcmEncryption);
    });

    it('create() with an unknown symmetric name throws a descriptive error', () => {
        expect(() => EncryptionFactory.create({ symmetric: 'UNKNOWN' })).toThrow(
            'Unknown symmetric strategy: "UNKNOWN"'
        );
    });

    it('create() with an unknown asymmetric name throws a descriptive error', () => {
        expect(() => EncryptionFactory.create({ asymmetric: 'UNKNOWN' })).toThrow(
            'Unknown asymmetric strategy: "UNKNOWN"'
        );
    });

    it('registerSymmetric() makes a custom strategy available by name', async () => {
        const mockSymmetric = new AesGcmEncryption();
        EncryptionFactory.registerSymmetric('MOCK-SYM', () => mockSymmetric);

        const { symmetric } = EncryptionFactory.create({ symmetric: 'MOCK-SYM' });
        expect(symmetric).toBe(mockSymmetric);
    });

    it('registerAsymmetric() makes a custom strategy available by name', () => {
        const mockAsymmetric = { generateKeypairs: jest.fn(), encryptMessage: jest.fn(), decryptMessage: jest.fn() };
        EncryptionFactory.registerAsymmetric('MOCK-ASM', () => mockAsymmetric);

        const { asymmetric } = EncryptionFactory.create({ asymmetric: 'MOCK-ASM' });
        expect(asymmetric).toBe(mockAsymmetric);
    });

    it('registerSymmetric() supports chaining', () => {
        const result = EncryptionFactory.registerSymmetric('CHAIN-TEST', () => new AesGcmEncryption());
        expect(result).toBe(EncryptionFactory);
    });
});

// ---------------------------------------------------------------------------
// Pluggable encryption – integration
// ---------------------------------------------------------------------------
describe('Pluggable encryption (integration)', () => {
    const { EncryptionFactory } = require('./encryptionFactory');
    const { AesGcmEncryption } = require('./cryptoAES');
    const { cryptoUtils } = require('./cryptoRSA');

    /**
     * Thin tracking wrapper: delegates every call to a real AesGcmEncryption
     * while recording which methods were invoked.
     */
    class TrackingSymmetric {
        readonly calls: string[] = [];
        private inner = new AesGcmEncryption();

        async init()                                      { this.calls.push('init');            return this.inner.init(); }
        async encryptData(data: ArrayBuffer)              { this.calls.push('encryptData');      return this.inner.encryptData(data); }
        async decryptData(data: BufferSource, iv: BufferSource) { this.calls.push('decryptData'); return this.inner.decryptData(data, iv); }
        async exportKey()                                 { this.calls.push('exportKey');        return this.inner.exportKey(); }
        async importRemoteKey(key: string)                { this.calls.push('importRemoteKey');  return this.inner.importRemoteKey(key); }
    }

    it('custom symmetric strategy is called through the factory', async () => {
        const impl = new TrackingSymmetric();
        EncryptionFactory.registerSymmetric('TRACKING-SYM', () => impl);

        const { symmetric } = EncryptionFactory.create({ symmetric: 'TRACKING-SYM' });

        await symmetric.init();
        const key = await symmetric.exportKey();
        await symmetric.importRemoteKey(key);
        const { encryptedData, iv } = await symmetric.encryptData(new TextEncoder().encode('test').buffer);
        await symmetric.decryptData(encryptedData, iv);

        expect(impl.calls).toEqual(['init', 'exportKey', 'importRemoteKey', 'encryptData', 'decryptData']);
    });

    it('custom asymmetric strategy is called through the factory', async () => {
        const calls: string[] = [];
        const impl = {
            generateKeypairs: async () => { calls.push('generateKeypairs'); return cryptoUtils.generateKeypairs(); },
            encryptMessage:   async (p: string, k: string) => { calls.push('encryptMessage');   return cryptoUtils.encryptMessage(p, k); },
            decryptMessage:   async (c: string, k: string) => { calls.push('decryptMessage');   return cryptoUtils.decryptMessage(c, k); },
        };
        EncryptionFactory.registerAsymmetric('TRACKING-ASM', () => impl);

        const { asymmetric } = EncryptionFactory.create({ asymmetric: 'TRACKING-ASM' });

        const { publicKey, privateKey } = await asymmetric.generateKeypairs();
        const ciphertext = await asymmetric.encryptMessage('hello', publicKey);
        const recovered  = await asymmetric.decryptMessage(ciphertext, privateKey);

        expect(recovered).toBe('hello');
        expect(calls).toEqual(['generateKeypairs', 'encryptMessage', 'decryptMessage']);
    });

    it('full SDK handshake protocol works end-to-end with factory-created strategies', async () => {
        // Mirrors exactly what sdk.ts does internally during setChannel()
        const aliceStrategy = EncryptionFactory.create();
        const bobStrategy   = EncryptionFactory.create();

        // Both peers initialise their symmetric keys
        await aliceStrategy.symmetric.init();
        await bobStrategy.symmetric.init();

        // Both peers generate asymmetric key pairs
        const { publicKey: alicePub, privateKey: alicePriv } = await aliceStrategy.asymmetric.generateKeypairs();
        const { publicKey: bobPub,   privateKey: bobPriv   } = await bobStrategy.asymmetric.generateKeypairs();

        // Alice wraps her symmetric key with Bob's public key and "sends" it
        const aliceExportedKey = await aliceStrategy.symmetric.exportKey();
        const wrappedKey       = await aliceStrategy.asymmetric.encryptMessage(aliceExportedKey, bobPub);

        // Bob unwraps it with his private key and imports it as the remote key
        const unwrappedKey = await bobStrategy.asymmetric.decryptMessage(wrappedKey, bobPriv);
        await bobStrategy.symmetric.importRemoteKey(unwrappedKey);

        // Alice encrypts a message; Bob decrypts it
        const plaintext = 'end-to-end via pluggable factory';
        const { encryptedData, iv } = await aliceStrategy.symmetric.encryptData(
            new TextEncoder().encode(plaintext).buffer
        );
        const decrypted = await bobStrategy.symmetric.decryptData(encryptedData, iv);

        expect(new TextDecoder().decode(decrypted)).toBe(plaintext);

        // Confirm the asymmetric keys are independent (no cross-contamination)
        await expect(
            aliceStrategy.asymmetric.decryptMessage(wrappedKey, alicePriv)
        ).rejects.toThrow();
    });
});
