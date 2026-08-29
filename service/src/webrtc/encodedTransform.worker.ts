import { combineEncryptedFrame, IV_LENGTH_BYTES, splitEncryptedFrame } from './frameData';

type TransformDirection = 'encrypt' | 'decrypt';

type TransformOptions = {
    direction: TransformDirection;
    key?: CryptoKey;
};

type EncodedFrame = {
    data: ArrayBuffer;
};

const worker = globalThis as unknown as {
    addEventListener(type: string, listener: (event: Event) => void): void;
    postMessage(message: unknown): void;
};

/**
 * Keys are kept per direction so they can be delivered after the transform has
 * been installed: the AES key exchange can still be in flight when the first
 * media frames arrive, and a missing key would otherwise drop every frame for
 * the rest of the call.
 */
const keys: Partial<Record<TransformDirection, CryptoKey>> = {};

worker.addEventListener('message', (event: Event) => {
    const data = (event as MessageEvent<{ type?: string; direction?: TransformDirection; key?: CryptoKey }>).data;
    if (data?.type === 'set-key' && data.direction && data.key) {
        keys[data.direction] = data.key;
    }
});

worker.addEventListener('rtctransform', (event: Event) => {
    const transformer = (event as Event & {
        transformer: { readable: ReadableStream; writable: WritableStream; options: TransformOptions };
    }).transformer;
    const { direction, key } = transformer.options;
    if (key) {
        keys[direction] = key;
    }

    transformer.readable
        .pipeThrough(new TransformStream({
            transform: async (frame: EncodedFrame, controller) => {
                try {
                    const activeKey = keys[direction];
                    if (!activeKey) {
                        worker.postMessage({ type: 'error', message: `No ${direction} key is available for the encoded transform.` });
                        return;
                    }
                    if (direction === 'encrypt') {
                        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
                        const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, activeKey, frame.data);
                        frame.data = combineEncryptedFrame(new Uint8Array(encryptedData), iv);
                    } else {
                        const { encryptedData, iv } = splitEncryptedFrame(frame.data);
                        frame.data = await crypto.subtle.decrypt(
                            { name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> },
                            activeKey,
                            encryptedData as BufferSource,
                        );
                    }
                    controller.enqueue(frame);
                } catch (error) {
                    worker.postMessage({
                        type: 'error',
                        message: `${direction === 'encrypt' ? 'Encryption' : 'Decryption'} error in encoded transform.`,
                        error: String(error),
                    });
                    // Match the Insertable Streams path: drop only the failed
                    // frame so plaintext is never forwarded after a failure.
                }
            },
        }))
        .pipeTo(transformer.writable)
        .catch((error) => worker.postMessage({
            type: 'error',
            message: 'Encoded transform stream failed.',
            error: String(error),
        }));
});
