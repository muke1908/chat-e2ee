/**
 * Symmetric key encryption used for encrypting Audio/Video data
 */
export class AesGcmEncryption {
    private aesKeyLocal?: CryptoKey;
    private aesKeyRemote?: CryptoKey;

    public async int(): Promise<CryptoKey> {
        if(this.aesKeyLocal) {
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
        if(!this.aesKeyRemote) {
            throw new Error("AES key from remote not set.");
        }
        return this.aesKeyRemote;
    }

    /**
     * To Do: 
     * this key is plain text, can be used to decrypt data.
     * Should not be transmitted over network.
     * Use cryptoUtils to encrypt the key and exchange.
     */
    public async getRawAesKeyToExport(): Promise<string> {
        if(!this.aesKeyLocal) {
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
          
          
            return { encryptedData: new Uint8Array(encryptedData) , iv };
    }

    public async decryptData(data: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
        if(!this.aesKeyRemote) {
            throw new Error('Remote AES key not set.')
        }
        return crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv
          },
          this.aesKeyRemote,  // Symmetric key for decryption
          data  // The encrypted  frame data
        );
      }

}