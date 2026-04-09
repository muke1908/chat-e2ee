const IV_BYTES = 12;

/**
 * Symmetric key encryption used for encrypting Audio/Video data and text messages.
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
        const jsonWebKey = await crypto.subtle.exportKey("jwk", this.aesKeyLocal);
        return JSON.stringify(jsonWebKey);
    }

    public async setRemoteAesKey(key: string): Promise<void> {
        const jsonWebKey = JSON.parse(key);
        this.aesKeyRemote = await crypto.subtle.importKey(
            "jwk",
            jsonWebKey,
            { name: "AES-GCM" },
            true, // Key is usable for decryption
            ["decrypt"] // Usage options for the key
        );

    }

    public async encryptData(data: ArrayBuffer) {
        if(!this.aesKeyLocal) {
            throw new Error('Local AES key not generated.')
        };
        // Generate an Initialization Vector (IV) for AES-GCM (12 bytes)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        // Encrypt the frame data using AES-GCM
        const encryptedData = await crypto.subtle.encrypt(
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
        return crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            this.aesKeyRemote,  // Symmetric key for decryption
            data  // The encrypted  frame data
        );
    }

    /**
     * Encrypt a UTF-8 text string with the local AES-GCM key.
     * Returns a base64-encoded blob containing the 12-byte IV followed by the ciphertext.
     */
    public async encryptText(text: string): Promise<string> {
        if (!this.aesKeyLocal) {
            throw new Error('Local AES key not generated.');
        }
        const encoded = new TextEncoder().encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            this.aesKeyLocal,
            encoded
        );
        const ciphertext = new Uint8Array(encryptedBuffer);
        const packed = new Uint8Array(IV_BYTES + ciphertext.length);
        packed.set(iv, 0);
        packed.set(ciphertext, IV_BYTES);
        let binary = '';
        for (let i = 0; i < packed.length; i++) {
            binary += String.fromCharCode(packed[i]);
        }
        return btoa(binary);
    }

    /**
     * Decrypt a base64-encoded AES-GCM blob (IV + ciphertext) produced by {@link encryptText}.
     * Uses the remote AES key set via {@link setRemoteAesKey}.
     */
    public async decryptText(encoded: string): Promise<string> {
        if (!this.aesKeyRemote) {
            throw new Error('Remote AES key not set.');
        }
        const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const iv = packed.slice(0, IV_BYTES);
        const ciphertext = packed.slice(IV_BYTES);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            this.aesKeyRemote,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }

}