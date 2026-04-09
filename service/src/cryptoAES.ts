/**
 * Interface for pluggable symmetric encryption strategies.
 * Implement this to swap in any symmetric cipher (e.g. AES-GCM, ChaCha20-Poly1305).
 */
export interface ISymmetricEncryption {
    /** Generate / initialise the local encryption key. Idempotent. */
    init(): Promise<void>;
    /** Encrypt a raw data buffer. Returns the ciphertext and the IV used. */
    encryptData(data: ArrayBuffer): Promise<{ encryptedData: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }>;
    /** Decrypt a ciphertext buffer using the previously imported remote key. */
    decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer>;
    /** Serialise the local key to a string for transmission (e.g. JWK JSON). */
    exportKey(): Promise<string>;
    /** Import the remote peer's serialised key so incoming data can be decrypted. */
    importRemoteKey(key: string): Promise<void>;
}

/**
 * AES-256-GCM implementation of ISymmetricEncryption.
 * Used for encrypting Audio/Video WebRTC streams.
 */
export class AesGcmEncryption implements ISymmetricEncryption {
    private aesKeyLocal?: CryptoKey;
    private aesKeyRemote?: CryptoKey;

    public async init(): Promise<void> {
        if (this.aesKeyLocal) {
            return;
        }
        this.aesKeyLocal = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    public async exportKey(): Promise<string> {
        if (!this.aesKeyLocal) {
            throw new Error('AES key not generated');
        }
        const jsonWebKey = await crypto.subtle.exportKey("jwk", this.aesKeyLocal);
        return JSON.stringify(jsonWebKey);
    }

    public async importRemoteKey(key: string): Promise<void> {
        const jsonWebKey = JSON.parse(key);
        this.aesKeyRemote = await crypto.subtle.importKey(
            "jwk",
            jsonWebKey,
            { name: "AES-GCM" },
            true,
            ["decrypt"]
        );
    }

    public async encryptData(data: ArrayBuffer): Promise<{ encryptedData: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> {
        if (!this.aesKeyLocal) {
            throw new Error('Local AES key not generated.');
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            this.aesKeyLocal,
            data
        );
        return { encryptedData: new Uint8Array(encryptedData), iv };
    }

    public async decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer> {
        if (!this.aesKeyRemote) {
            throw new Error('Remote AES key not set.');
        }
        return crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            this.aesKeyRemote,
            data
        );
    }
}
