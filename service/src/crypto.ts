interface ICryptoUtils {
    generateKeypairs(): Promise<{privateKey: string, publicKey: string}>,
    encryptMessage(plaintext: string, publicKey: string): Promise<string>,
    decryptMessage(ciphertext: string, privateKey: string): Promise<string>,
}

// Generate an RSA key pair
async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    const modulusLength = 2048;
    const publicExponent = new Uint8Array([0x01, 0x00, 0x01]); // 65537

    const algorithm: RsaHashedKeyGenParams = {
        name: 'RSA-OAEP',
        modulusLength,
        publicExponent,
        hash: 'SHA-256',
    };

    return window.crypto.subtle.generateKey(algorithm, true, ['encrypt', 'decrypt']);
}

// Encrypt a plaintext message using the public key from an RSA key pair
async function encryptMessage(plaintext: string, publicKey: CryptoKey): Promise<ArrayBuffer> {
    const encoded = new TextEncoder().encode(plaintext);

    const algorithm: RsaOaepParams = {
        name: "RSA-OAEP",
    };

    const encrypted = await window.crypto.subtle.encrypt(algorithm, publicKey, encoded);

    return encrypted;
}

// Decrypt a ciphertext message using the private key from an RSA key pair
async function decryptMessage(ciphertext: ArrayBuffer, privateKey: CryptoKey): Promise<string> {
    const algorithm: RsaOaepParams = {
        name: "RSA-OAEP",
    };

    const decrypted = await window.crypto.subtle.decrypt(algorithm, privateKey, ciphertext);

    const plaintext = new TextDecoder().decode(decrypted);

    return plaintext;
}

export const cryptoUtils: ICryptoUtils = {
    generateKeypairs: async (): Promise<{privateKey: string, publicKey: string}> => {
        const { privateKey, publicKey } = await generateRSAKeyPair();
        return {
            privateKey: await exportKey(privateKey),
            publicKey: await exportKey(publicKey)
        }
    },
    encryptMessage: async (plaintext: string, publicKey: string): Promise<string> => {
        const publicCryptoKey = await importKey(publicKey, 'encrypt');
        return typedArrayToStr(await encryptMessage(plaintext, publicCryptoKey));
    },
    decryptMessage: async (ciphertext: string, privateKey: string): Promise<string> => {
        const privateCryptoKey = await importKey(privateKey, 'decrypt');
        return decryptMessage(strToTypedArr(ciphertext), privateCryptoKey)
    },
}

const exportKey = async (key: CryptoKey): Promise<string> => {
    return JSON.stringify(await window.crypto.subtle.exportKey('jwk', key));
}

const importKey = async (key: string, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(key),
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256',
        },
        true,
        [usage]
    );
}

const typedArrayToStr = (arrayBuffer: ArrayBuffer): string => {
    // Convert the ArrayBuffer to a Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Populate the Uint8Array with some data (for example, all zeros)
    // uint8Array.fill(0);

    // Convert the Uint8Array to a base64-encoded string
    return window.btoa(String.fromCharCode.apply(null, uint8Array as unknown as number[]));
}

const strToTypedArr = (base64String: string): ArrayBuffer => {
    // Decode the base64 string to a Uint8Array
    const uint8Array = new Uint8Array(window.atob(base64String).split('').map(char => char.charCodeAt(0)));

    // Create a new ArrayBuffer from the Uint8Array
    return uint8Array.buffer;
}


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