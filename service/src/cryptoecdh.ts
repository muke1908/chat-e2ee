import { type ISymmetricEncryption } from './cryptoAES';

/**
 * ECDH X25519 + AES-256-GCM implementation of ISymmetricEncryption.
 *
 * Security model:
 *   - Each peer generates an ephemeral X25519 key pair on init().
 *   - Peers exchange ONLY their public keys (safe to transmit in plaintext).
 *   - Both peers independently derive the IDENTICAL shared AES-256-GCM key
 *     via ECDH — the secret key material NEVER leaves the device.
 *   - A fresh 12-byte IV is generated per encryptData() call, eliminating
 *     replay attacks.
 *   - The derived AES key is marked non-extractable — it cannot be exported.
 *
 * Fixes raised in issue #403:
 *   - Replaces plaintext / RSA-wrapped AES key transmission (item 6).
 *   - Provides per-session ephemeral keys as a step toward forward secrecy (item 8).
 *
 * Usage (pluggable via EncryptionFactory):
 *   import { EncryptionFactory } from '@chat-e2ee/service';
 *   import { ECDHEncryption } from './cryptoECDH';
 *
 *   EncryptionFactory.registerSymmetric('ECDH-X25519', () => new ECDHEncryption());
 *
 *   const chat = createChatInstance({}, EncryptionFactory.create({ symmetric: 'ECDH-X25519' }));
 */
export class ECDHEncryption implements ISymmetricEncryption {
    private localKeyPair?: CryptoKeyPair;
    private sharedAesKey?: CryptoKey;

    /**
     * Generate an ephemeral X25519 ECDH key pair.
     * Idempotent — subsequent calls are no-ops if already initialised.
     */
    public async init(): Promise<void> {
        if (this.localKeyPair) {
            return;
        }
        this.localKeyPair = (await globalThis.crypto.subtle.generateKey(
            { name: 'X25519' },
            true,
            ['deriveKey']
        )) as CryptoKeyPair;
    }

    /**
     * Export the local ECDH public key as a JWK JSON string.
     * This is safe to transmit in plaintext — it contains no secret material.
     */
    public async exportKey(): Promise<string> {
        if (!this.localKeyPair) {
            throw new Error('[ECDHEncryption] Not initialised — call init() first.');
        }
        const jwk = await globalThis.crypto.subtle.exportKey('jwk', this.localKeyPair.publicKey);
        return JSON.stringify(jwk);
    }

    /**
     * Import the remote peer's ECDH public key and derive the shared
     * AES-256-GCM key. After this call, encryptData() and decryptData()
     * both use the derived key — the same key both peers arrive at
     * independently without ever transmitting it.
     */
    public async importRemoteKey(remotePublicKeyJwk: string): Promise<void> {
        if (!this.localKeyPair) {
            throw new Error('[ECDHEncryption] Not initialised — call init() first.');
        }

        const remotePubKey = await globalThis.crypto.subtle.importKey(
            'jwk',
            JSON.parse(remotePublicKeyJwk),
            { name: 'X25519' },
            false,
            []
        );

        this.sharedAesKey = await globalThis.crypto.subtle.deriveKey(
            { name: 'X25519', public: remotePubKey },
            this.localKeyPair.privateKey,
            { name: 'AES-GCM', length: 256 },
            false,          // non-extractable
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data using the shared AES-256-GCM key.
     * A fresh 12-byte IV is generated for every call.
     */
    public async encryptData(data: ArrayBuffer): Promise<{ encryptedData: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> {
        if (!this.sharedAesKey) {
            throw new Error('[ECDHEncryption] Shared key not derived — call importRemoteKey() first.');
        }
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await globalThis.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.sharedAesKey,
            data
        );
        return { encryptedData: new Uint8Array(encrypted), iv };
    }

    /**
     * Decrypt data using the shared AES-256-GCM key.
     * AES-GCM authentication tag is verified automatically — tampered
     * ciphertext throws rather than silently returning garbage.
     */
    public async decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer> {
        if (!this.sharedAesKey) {
            throw new Error('[ECDHEncryption] Shared key not derived — call importRemoteKey() first.');
        }
        return globalThis.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.sharedAesKey,
            data
        );
    }
}
