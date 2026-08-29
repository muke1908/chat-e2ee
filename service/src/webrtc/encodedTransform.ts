import type { ISymmetricEncryption } from '../crypto/cryptoAES';
import { Logger } from '../utils/logger';
import { createEncodedTransformWorker } from './encodedTransformWorkerFactory';
import { FrameCodec } from './frameCodec';
import type { RTCRtpReceiverWithStreams, RTCRtpSenderWithStreams } from './types';

type EncodedTransformTarget = RTCRtpSender | RTCRtpReceiver;
type TransformDirection = 'encrypt' | 'decrypt';

type ScriptTransformConstructor = new (
    worker: Worker,
    options: { direction: TransformDirection; key?: CryptoKey },
) => RTCRtpScriptTransform;

/** How often the transform re-checks for a key that was not ready at install time. */
const KEY_POLL_INTERVAL_MS = 250;
/** Give up waiting for a key after this long so the interval cannot leak. */
const KEY_POLL_TIMEOUT_MS = 30_000;

function hasTransformProperty(target: typeof RTCRtpSender | typeof RTCRtpReceiver | undefined): boolean {
    return !!target && 'transform' in target.prototype;
}

export function supportsScriptTransform(): boolean {
    return typeof Worker !== 'undefined'
        && typeof (globalThis as { RTCRtpScriptTransform?: unknown }).RTCRtpScriptTransform === 'function'
        && hasTransformProperty(globalThis.RTCRtpSender)
        && hasTransformProperty(globalThis.RTCRtpReceiver);
}

export function supportsCreateEncodedStreams(): boolean {
    return typeof RTCRtpSender !== 'undefined'
        && typeof RTCRtpReceiver !== 'undefined'
        && typeof (RTCRtpSender.prototype as RTCRtpSenderWithStreams).createEncodedStreams === 'function'
        && typeof (RTCRtpReceiver.prototype as RTCRtpReceiverWithStreams).createEncodedStreams === 'function';
}

export function supportsEncodedTransforms(): boolean {
    return supportsScriptTransform() || supportsCreateEncodedStreams();
}

/**
 * Attaches the AES-GCM encoded-frame transform.
 *
 * Insertable Streams is preferred where available because it runs in the same
 * realm as the SDK and reads the shared key lazily for every frame, so a key
 * that is imported after the transform is installed still works. The Script
 * Transform worker is used only where Insertable Streams is missing
 * (e.g. Firefox / Safari); it needs the key up front, so it is refreshed over
 * postMessage once the key becomes available.
 */
export function applyEncodedTransform(
    target: EncodedTransformTarget,
    direction: TransformDirection,
    encryption: ISymmetricEncryption,
    frameCodec: FrameCodec,
    logger: Logger,
): () => void {
    if (supportsCreateEncodedStreams()) {
        return applyEncodedStreamsTransform(target, direction, frameCodec, logger);
    }

    if (supportsScriptTransform()) {
        const getKey = encryption.getEncodedTransformKey?.bind(encryption);
        if (!getKey) {
            throw new Error('RTCRtpScriptTransform requires an encryption strategy that exposes a Web Crypto key.');
        }
        return applyScriptTransform(target, direction, () => getKey(direction), logger);
    }

    throw new Error('Encoded frame transforms are not supported by this browser.');
}

function applyScriptTransform(
    target: EncodedTransformTarget,
    direction: TransformDirection,
    getKey: () => CryptoKey | undefined,
    logger: Logger,
): () => void {
    let worker: Worker | undefined;
    let keyPoll: ReturnType<typeof setInterval> | undefined;
    const stopKeyPoll = () => {
        if (keyPoll) {
            clearInterval(keyPoll);
            keyPoll = undefined;
        }
    };

    try {
        worker = createEncodedTransformWorker();
        worker.onerror = (event) => {
            stopKeyPoll();
            logger.log('Encoded transform worker error:', event.message);
        };
        worker.onmessage = (event: MessageEvent<{ type: string; message: string; error?: string }>) => {
            if (event.data.type === 'error') {
                logger.log(event.data.message, event.data.error ?? '');
            }
        };
        const ScriptTransform = (globalThis as { RTCRtpScriptTransform: ScriptTransformConstructor }).RTCRtpScriptTransform;
        const initialKey = getKey();
        (target as EncodedTransformTarget & { transform: RTCRtpScriptTransform | null }).transform =
            new ScriptTransform(worker, { direction, key: initialKey });

        if (!initialKey) {
            logger.log(`No ${direction} key yet, waiting for the key exchange to complete.`);
            const startedAt = Date.now();
            keyPoll = setInterval(() => {
                const key = getKey();
                if (key) {
                    stopKeyPoll();
                    worker?.postMessage({ type: 'set-key', direction, key });
                    return;
                }
                if (Date.now() - startedAt >= KEY_POLL_TIMEOUT_MS) {
                    stopKeyPoll();
                    logger.log(`Timed out waiting for the ${direction} key.`);
                }
            }, KEY_POLL_INTERVAL_MS);
        }

        return () => {
            stopKeyPoll();
            worker?.terminate();
        };
    } catch (error) {
        stopKeyPoll();
        worker?.terminate();
        throw new Error(`Unable to initialize RTCRtpScriptTransform: ${String(error)}`);
    }
}

function applyEncodedStreamsTransform(
    target: EncodedTransformTarget,
    direction: TransformDirection,
    frameCodec: FrameCodec,
    logger: Logger,
): () => void {
    const streams = (target as RTCRtpSenderWithStreams | RTCRtpReceiverWithStreams).createEncodedStreams();
    streams.readable
        .pipeThrough(direction === 'encrypt' ? frameCodec.createEncryptTransform() : frameCodec.createDecryptTransform())
        .pipeTo(streams.writable)
        .catch((error) => logger.log('Encoded transform stream failed:', error));
    return () => undefined;
}
