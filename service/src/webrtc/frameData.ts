export const IV_LENGTH_BYTES = 12;

export function combineEncryptedFrame(encryptedData: Uint8Array, iv: Uint8Array): ArrayBuffer {
    const data = new Uint8Array(iv.length + encryptedData.byteLength);
    data.set(iv, 0);
    data.set(encryptedData, iv.length);
    return data.buffer;
}

export function splitEncryptedFrame(data: ArrayBuffer): { encryptedData: Uint8Array; iv: Uint8Array } {
    const bytes = new Uint8Array(data);
    return {
        iv: bytes.slice(0, IV_LENGTH_BYTES),
        encryptedData: bytes.slice(IV_LENGTH_BYTES),
    };
}
