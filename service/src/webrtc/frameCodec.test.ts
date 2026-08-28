import { FrameCodec } from './frameCodec';
import { Logger } from '../utils/logger';
import type { ISymmetricEncryption } from '../crypto/cryptoAES';

/** Minimal fake matching the shape of an RTCEncodedAudioFrame consumed by the transforms. */
interface FakeEncodedFrame {
    data: ArrayBuffer;
}

async function runTransform(transform: TransformStream, input: FakeEncodedFrame): Promise<FakeEncodedFrame> {
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    // write() only resolves once the chunk has been read out (backpressure),
    // so the write and the read must be raced concurrently rather than sequentially.
    const [, { value }] = await Promise.all([
        writer.write(input as unknown as RTCEncodedAudioFrame),
        reader.read(),
    ]);

    await writer.close();
    reader.releaseLock();

    return value as unknown as FakeEncodedFrame;
}

function makeFakeEncryption(): jest.Mocked<ISymmetricEncryption> {
    return {
        encryptData: jest.fn(),
        decryptData: jest.fn(),
    } as unknown as jest.Mocked<ISymmetricEncryption>;
}

describe('FrameCodec', () => {
    it('createEncryptTransform() prefixes the ciphertext with the IV', async () => {
        const iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const encryptedData = new Uint8Array([9, 9, 9]);
        const encryption = makeFakeEncryption();
        encryption.encryptData.mockResolvedValue({ encryptedData, iv });

        const codec = new FrameCodec(encryption, new Logger('test'));
        const transform = codec.createEncryptTransform();

        const plaintext = new Uint8Array([42]).buffer;
        const result = await runTransform(transform, { data: plaintext });

        expect(encryption.encryptData).toHaveBeenCalledWith(plaintext);
        const combined = new Uint8Array(result.data);
        expect(combined.slice(0, 12)).toEqual(iv);
        expect(combined.slice(12)).toEqual(encryptedData);
    });

    it('createDecryptTransform() splits the IV from the ciphertext before decrypting', async () => {
        const iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const cipherBytes = new Uint8Array([5, 6, 7]);
        const decryptedData = new Uint8Array([42]).buffer;
        const encryption = makeFakeEncryption();
        encryption.decryptData.mockResolvedValue(decryptedData);

        const codec = new FrameCodec(encryption, new Logger('test'));
        const transform = codec.createDecryptTransform();

        const combined = new Uint8Array(iv.length + cipherBytes.length);
        combined.set(iv, 0);
        combined.set(cipherBytes, iv.length);

        const result = await runTransform(transform, { data: combined.buffer });

        expect(encryption.decryptData).toHaveBeenCalled();
        const [calledCipher, calledIv] = encryption.decryptData.mock.calls[0];
        expect(new Uint8Array(calledCipher as ArrayBuffer)).toEqual(cipherBytes);
        expect(new Uint8Array(calledIv as ArrayBuffer)).toEqual(iv);
        expect(result.data).toBe(decryptedData);
    });

    it('createEncryptTransform() swallows encryption errors instead of throwing', async () => {
        const encryption = makeFakeEncryption();
        encryption.encryptData.mockRejectedValue(new Error('boom'));

        const codec = new FrameCodec(encryption, new Logger('test'));
        const transform = codec.createEncryptTransform();

        const writer = transform.writable.getWriter();
        const reader = transform.readable.getReader();
        // Pulling from the reader creates read demand so the transform()
        // callback actually runs; nothing will ever be enqueued on error, so
        // we don't await the read, just assert the write doesn't reject/throw.
        reader.read().catch(() => undefined);

        const writePromise = writer.write({ data: new ArrayBuffer(1) } as unknown as RTCEncodedAudioFrame);
        const rejected = jest.fn();
        writePromise.catch(rejected);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(encryption.encryptData).toHaveBeenCalled();
        expect(rejected).not.toHaveBeenCalled();
    });

    it('createDecryptTransform() swallows decryption errors instead of throwing', async () => {
        const encryption = makeFakeEncryption();
        encryption.decryptData.mockRejectedValue(new Error('boom'));

        const codec = new FrameCodec(encryption, new Logger('test'));
        const transform = codec.createDecryptTransform();

        const writer = transform.writable.getWriter();
        const reader = transform.readable.getReader();
        reader.read().catch(() => undefined);

        const combined = new Uint8Array(12 + 3);
        const writePromise = writer.write({ data: combined.buffer } as unknown as RTCEncodedAudioFrame);
        const rejected = jest.fn();
        writePromise.catch(rejected);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(encryption.decryptData).toHaveBeenCalled();
        expect(rejected).not.toHaveBeenCalled();
    });
});
