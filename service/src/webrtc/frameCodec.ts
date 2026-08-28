import { type ISymmetricEncryption } from "../crypto/cryptoAES";
import { Logger } from "../utils/logger";

/**
 * Encrypts/decrypts individual encoded WebRTC media frames using the shared
 * symmetric key, framing each encrypted frame as `iv (12 bytes) + ciphertext`.
 *
 * Extracted from Peer so the encrypt/decrypt frame-transform logic has a
 * single implementation, instead of being duplicated across the
 * applyEncryption/applyDecryption transform callbacks.
 */
const IV_LENGTH_BYTES = 12;

export class FrameCodec {
    constructor(private encryption: ISymmetricEncryption, private logger: Logger) {}

    public createEncryptTransform(): TransformStream {
        return new TransformStream({
            transform: async (chunk: RTCEncodedAudioFrame, controller) => {
                try {
                    const { encryptedData, iv } = await this.encryption.encryptData(chunk.data);

                    const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
                    combinedData.set(iv, 0);
                    combinedData.set(encryptedData, iv.length);

                    chunk.data = combinedData.buffer;
                    controller.enqueue(chunk);
                } catch (error) {
                    this.logger.log('Encryption error:', error);
                }
            }
        });
    }

    public createDecryptTransform(): TransformStream {
        return new TransformStream({
            transform: async (chunk: RTCEncodedAudioFrame, controller) => {
                try {
                    const data = new Uint8Array(chunk.data);
                    const iv = data.slice(0, IV_LENGTH_BYTES);
                    const encryptedData = data.slice(IV_LENGTH_BYTES);

                    const decryptedData = await this.encryption.decryptData(encryptedData, iv);
                    chunk.data = decryptedData;
                    controller.enqueue(chunk);
                } catch (error) {
                    this.logger.log('Decryption error:', error);
                }
            }
        });
    }
}
