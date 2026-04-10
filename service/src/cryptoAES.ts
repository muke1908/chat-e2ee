/**
 * Symmetric key encryption used for encrypting Audio/Video data
 */
export class AesGcmEncryption {
    private aesKeyLocal?: CryptoKey;
    private aesKeyRemote?: CryptoKey;

    public async int(): Promise<CryptoKey> {
        if (this.aesKeyLocal) {
            return this.aesKeyLocal;
        }
        const key = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        this.aesKeyLocal = key;
        return this.aesKeyLocal;
    }

    public getRemoteAesKey(): CryptoKey {
        if (!this.aesKeyRemote) {
            throw new Error("AES key from remote not set.");
        }
        return this.aesKeyRemote;
    }

    public async getRawAesKeyToExport(): Promise<string> {
        if (!this.aesKeyLocal) {
            throw new Error('AES key not generated');
        }
        const jsonWebKey = await window.crypto.subtle.exportKey("jwk", this.aesKeyLocal);
        return JSON.stringify(jsonWebKey);
    }

    public async setRemoteAesKey(key: string): Promise<void> {
        const jsonWebKey = JSON.parse(key);
        this.aesKeyRemote = await window.crypto.subtle.importKey(
            "jwk",
            jsonWebKey,
            { name: "AES-GCM" },
            true, // Key is usable for decryption
            ["decrypt"] // Usage options for the key
        );

    }

    public async encryptData(data: ArrayBuffer) {
        if (!this.aesKeyLocal) {
            throw new Error('Local AES key not generated.')
        };
        // Generate an Initialization Vector (IV) for AES-GCM (12 bytes)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        // Encrypt the frame data using AES-GCM
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.aesKeyLocal,      // Symmetric key for encryption
            data    // The frame data to be encrypted
        );


        return { encryptedData: new Uint8Array(encryptedData), iv };
    }

    public async decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer> {
        if (!this.aesKeyRemote) {
            throw new Error('Remote AES key not set.')
        }
        return window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            this.aesKeyRemote,  // Symmetric key for decryption
            data  // The encrypted  frame data
        );
    }

}