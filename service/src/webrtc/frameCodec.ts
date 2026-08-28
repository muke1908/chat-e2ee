import { type ISymmetricEncryption } from "../crypto/cryptoAES";
import { Logger } from "../utils/logger";
import { combineEncryptedFrame, splitEncryptedFrame } from "./frameData";

/**
 * Encrypts/decrypts individual encoded WebRTC media frames using the shared
 * symmetric key, framing each encrypted frame as `iv (12 bytes) + ciphertext`.
 *
 * Extracted from Peer so the encrypt/decrypt frame-transform logic has a
 * single implementation, instead of being duplicated across the
 * applyEncryption/applyDecryption transform callbacks.
 */
export class FrameCodec {
    constructor(private encryption: ISymmetricEncryption, private logger: Logger) {}

    public createEncryptTransform(): TransformStream {
        return new TransformStream({
            transform: async (chunk: RTCEncodedAudioFrame, controller) => {
                try {
                    const { encryptedData, iv } = await this.encryption.encryptData(chunk.data);

                    chunk.data = combineEncryptedFrame(encryptedData, iv);
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
                    const { encryptedData, iv } = splitEncryptedFrame(chunk.data);

                    const decryptedData = await this.encryption.decryptData(encryptedData as BufferSource, iv as BufferSource);
                    chunk.data = decryptedData;
                    controller.enqueue(chunk);
                } catch (error) {
                    this.logger.log('Decryption error:', error);
                }
            }
        });
    }
}
