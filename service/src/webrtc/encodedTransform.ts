import type { ISymmetricEncryption } from '../crypto/cryptoAES';
import { Logger } from '../utils/logger';
import { FrameCodec } from './frameCodec';
import type { RTCRtpReceiverWithStreams, RTCRtpSenderWithStreams } from './types';

type EncodedTransformTarget = RTCRtpSender | RTCRtpReceiver;
type TransformDirection = 'encrypt' | 'decrypt';

type ScriptTransformConstructor = new (
    worker: Worker,
    options: { direction: TransformDirection; key?: CryptoKey },
) => RTCRtpScriptTransform;

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
 * Attaches the same AES-GCM encoded-frame transform through the browser's
 * preferred Script Transform API, falling back to Insertable Streams.
 */
export function applyEncodedTransform(
    target: EncodedTransformTarget,
    direction: TransformDirection,
    encryption: ISymmetricEncryption,
    frameCodec: FrameCodec,
    logger: Logger,
): () => void {
    if (supportsScriptTransform() && encryption.getEncodedTransformKey) {
        return applyScriptTransform(target, direction, encryption.getEncodedTransformKey(direction), logger);
    }

    if (supportsCreateEncodedStreams()) {
        return applyEncodedStreamsTransform(target, direction, frameCodec, logger);
    }

    if (supportsScriptTransform()) {
        throw new Error('RTCRtpScriptTransform requires an encryption strategy that exposes a Web Crypto key.');
    }

    throw new Error('Encoded frame transforms are not supported by this browser.');
}

function applyScriptTransform(
    target: EncodedTransformTarget,
    direction: TransformDirection,
    key: CryptoKey | undefined,
    logger: Logger,
): () => void {
    let worker: Worker | undefined;
    try {
        worker = new Worker('./encodedTransform.worker.js', { type: 'module' });
        worker.onerror = (event) => logger.log('Encoded transform worker error:', event.message);
        worker.onmessage = (event: MessageEvent<{ type: string; message: string; error?: string }>) => {
            if (event.data.type === 'error') {
                logger.log(event.data.message, event.data.error ?? '');
            }
        };
        const ScriptTransform = (globalThis as { RTCRtpScriptTransform: ScriptTransformConstructor }).RTCRtpScriptTransform;
        (target as EncodedTransformTarget & { transform: RTCRtpScriptTransform | null }).transform =
            new ScriptTransform(worker, { direction, key });
        return () => worker?.terminate();
    } catch (error) {
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
