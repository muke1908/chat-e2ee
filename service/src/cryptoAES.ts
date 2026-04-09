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
 * AES-GCM encryption using ECDH for key exchange.
 * Implements ISymmetricEncryptionProtocol for WebRTC media encryption.
 */
export class AesGcmEncryption implements ISymmetricEncryption {
    private ecdhPrivateKey?: CryptoKey;
    private ecdhPublicKey?: CryptoKey;
    private sharedAesKey?: CryptoKey;

    public async init(): Promise<void> {
        if (this.ecdhPrivateKey) {
            return;
        }
        // Generate ECDH key pair
        const keyPair = await window.crypto.subtle.generateKey(
            { name: "X25519" },
            true, // extractable
            ["deriveKey", "deriveBits"]
        ) as CryptoKeyPair;

        this.ecdhPrivateKey = keyPair.privateKey;
        this.ecdhPublicKey = keyPair.publicKey;
    }

    public getRemoteAesKey(): CryptoKey {
        if (!this.sharedAesKey) {
            throw new Error('Shared AES key not derived');
        }
        return this.sharedAesKey;
    }

    public async getRawAesKeyToExport(): Promise<string> {
        if (!this.ecdhPublicKey) {
            throw new Error('ECDH keys not generated');
        }
        const jsonWebKey = await window.crypto.subtle.exportKey("jwk", this.ecdhPublicKey);
        return JSON.stringify(jsonWebKey);
    }

    /** Satisfies ISymmetricEncryption interface — delegates to getRawAesKeyToExport */
    public exportKey(): Promise<string> {
        return this.getRawAesKeyToExport();
    }

    public async setRemoteAesKey(key: string): Promise<void> {
        if (!this.ecdhPrivateKey) {
            throw new Error('Local ECDH private key not generated');
        }
        const jsonWebKey = JSON.parse(key);
        const remotePublicKey = await window.crypto.subtle.importKey(
            "jwk",
            jsonWebKey,
            { name: "X25519" },
            true,
            [] // public keys don't require key usages for derivation
        );

        // Derive shared AES-GCM key
        this.sharedAesKey = await window.crypto.subtle.deriveKey(
            { name: "X25519", public: remotePublicKey },
            this.ecdhPrivateKey,
            { name: "AES-GCM", length: 256 },
            false, // AES key is never extracted/transmitted
            ["encrypt", "decrypt"]
        );
    }

    /** Satisfies ISymmetricEncryption interface — delegates to setRemoteAesKey */
    public importRemoteKey(key: string): Promise<void> {
        return this.setRemoteAesKey(key);
    }

    public async encryptData(data: ArrayBuffer): Promise<{ encryptedData: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> {
        if (!this.sharedAesKey) {
            throw new Error('Shared AES key not derived.')
        };
        // Generate an Initialization Vector (IV) for AES-GCM (12 bytes)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        // Encrypt the frame data using AES-GCM
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.sharedAesKey,      // Symmetric key for encryption
            data    // The frame data to be encrypted
        );
        return { encryptedData: new Uint8Array(encryptedData), iv };
    }

    public async decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer> {
        if (!this.sharedAesKey) {
            throw new Error('Shared AES key not derived.')
        }
        return window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            this.sharedAesKey,  // Symmetric key for decryption
            data  // The encrypted  frame data
        );
    }
}
