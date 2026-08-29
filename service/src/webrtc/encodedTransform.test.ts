import type { ISymmetricEncryption } from '../crypto/cryptoAES';
import { Logger } from '../utils/logger';
import {
    applyEncodedTransform,
    supportsCreateEncodedStreams,
    supportsEncodedTransforms,
    supportsScriptTransform,
} from './encodedTransform';
import { FrameCodec } from './frameCodec';

const logger = new Logger('test');

class FakeSender {
    public transform: unknown;
    public createEncodedStreams = jest.fn().mockReturnValue({
        readable: { pipeThrough: jest.fn().mockReturnThis(), pipeTo: jest.fn().mockResolvedValue(undefined) },
        writable: {},
    });
}

class FakeReceiver {
    public transform: unknown;
    public createEncodedStreams = jest.fn().mockReturnValue({
        readable: { pipeThrough: jest.fn().mockReturnThis(), pipeTo: jest.fn().mockResolvedValue(undefined) },
        writable: {},
    });
}

class FakeWorker {
    public onerror: ((event: ErrorEvent) => void) | null = null;
    public onmessage: ((event: MessageEvent) => void) | null = null;
    public terminate = jest.fn();
    public postMessage = jest.fn();
}

function installGlobals({ scriptTransform = false, streams = true }: { scriptTransform?: boolean; streams?: boolean } = {}) {
    class SenderPrototype {
        public transform: unknown;
    }
    class ReceiverPrototype {
        public transform: unknown;
    }
    if (streams) {
        (SenderPrototype.prototype as any).createEncodedStreams = jest.fn();
        (ReceiverPrototype.prototype as any).createEncodedStreams = jest.fn();
    }
    Object.defineProperty(SenderPrototype.prototype, 'transform', { value: undefined, writable: true });
    Object.defineProperty(ReceiverPrototype.prototype, 'transform', { value: undefined, writable: true });
    (globalThis as any).RTCRtpSender = SenderPrototype;
    (globalThis as any).RTCRtpReceiver = ReceiverPrototype;
    (globalThis as any).Worker = FakeWorker;
    if (scriptTransform) {
        (globalThis as any).RTCRtpScriptTransform = jest.fn().mockImplementation((worker, options) => ({ worker, options }));
    } else {
        delete (globalThis as any).RTCRtpScriptTransform;
    }
}

function uninstallGlobals() {
    delete (globalThis as any).RTCRtpSender;
    delete (globalThis as any).RTCRtpReceiver;
    delete (globalThis as any).RTCRtpScriptTransform;
    delete (globalThis as any).Worker;
}

describe('encoded transform selection', () => {
    beforeEach(() => jest.clearAllMocks());
    afterEach(uninstallGlobals);

    it('selects RTCRtpScriptTransform and gives the worker the AES key when Insertable Streams is unavailable', () => {
        installGlobals({ scriptTransform: true, streams: false });
        const key = {} as CryptoKey;
        const encryption = { getEncodedTransformKey: jest.fn().mockReturnValue(key) } as unknown as ISymmetricEncryption;
        const sender = new FakeSender();

        const cleanup = applyEncodedTransform(
            sender as unknown as RTCRtpSender,
            'encrypt',
            encryption,
            makeFrameCodec(),
            logger,
        );

        expect((globalThis as any).RTCRtpScriptTransform).toHaveBeenCalledWith(
            expect.any(FakeWorker),
            { direction: 'encrypt', key },
        );
        expect(sender.createEncodedStreams).not.toHaveBeenCalled();
        cleanup();
    });

    it('prefers createEncodedStreams even when Script Transform is available', () => {
        installGlobals({ scriptTransform: true });
        const sender = new FakeSender();
        const encryptTransform = { marker: 'encrypt' } as unknown as TransformStream;
        const frameCodec = makeFrameCodec();
        jest.spyOn(frameCodec, 'createEncryptTransform').mockReturnValue(encryptTransform);

        applyEncodedTransform(sender as unknown as RTCRtpSender, 'encrypt', {} as ISymmetricEncryption, frameCodec, logger);

        expect(sender.createEncodedStreams).toHaveBeenCalled();
        expect((globalThis as any).RTCRtpScriptTransform).not.toHaveBeenCalled();
        expect(supportsCreateEncodedStreams()).toBe(true);
        expect(supportsScriptTransform()).toBe(true);
    });

    it('reports an unsupported environment', () => {
        installGlobals({ streams: false });

        expect(() => applyEncodedTransform(
            new FakeSender() as unknown as RTCRtpSender,
            'decrypt',
            {} as ISymmetricEncryption,
            makeFrameCodec(),
            logger,
        )).toThrow('Encoded frame transforms are not supported');
        expect(supportsEncodedTransforms()).toBe(false);
    });

    it('uses the same selection for receiver decryption', () => {
        installGlobals({ scriptTransform: true, streams: false });
        const key = {} as CryptoKey;
        const encryption = { getEncodedTransformKey: jest.fn().mockReturnValue(key) } as unknown as ISymmetricEncryption;

        applyEncodedTransform(new FakeReceiver() as unknown as RTCRtpReceiver, 'decrypt', encryption, makeFrameCodec(), logger);

        expect((globalThis as any).RTCRtpScriptTransform).toHaveBeenCalledWith(
            expect.any(FakeWorker),
            { direction: 'decrypt', key },
        );
    });

    it('propagates Script Transform worker initialization errors', () => {
        installGlobals({ scriptTransform: true, streams: false });
        (globalThis as any).Worker = jest.fn(() => { throw new Error('worker failed'); });
        const encryption = { getEncodedTransformKey: jest.fn() } as unknown as ISymmetricEncryption;

        expect(() => applyEncodedTransform(
            new FakeSender() as unknown as RTCRtpSender,
            'encrypt',
            encryption,
            makeFrameCodec(),
            logger,
        )).toThrow('Unable to initialize RTCRtpScriptTransform: Error: worker failed');
    });

    it('sends the key to the worker once the key exchange completes', () => {
        jest.useFakeTimers();
        installGlobals({ scriptTransform: true, streams: false });
        let key: CryptoKey | undefined;
        const encryption = {
            getEncodedTransformKey: jest.fn(() => key),
        } as unknown as ISymmetricEncryption;

        const cleanup = applyEncodedTransform(
            new FakeReceiver() as unknown as RTCRtpReceiver,
            'decrypt',
            encryption,
            makeFrameCodec(),
            logger,
        );

        const worker = (globalThis as any).RTCRtpScriptTransform.mock.calls[0][0] as FakeWorker;
        expect((globalThis as any).RTCRtpScriptTransform).toHaveBeenCalledWith(worker, { direction: 'decrypt', key: undefined });

        jest.advanceTimersByTime(500);
        expect(worker.postMessage).not.toHaveBeenCalled();

        key = {} as CryptoKey;
        jest.advanceTimersByTime(500);
        expect(worker.postMessage).toHaveBeenCalledWith({ type: 'set-key', direction: 'decrypt', key });

        worker.postMessage.mockClear();
        jest.advanceTimersByTime(5000);
        expect(worker.postMessage).not.toHaveBeenCalled();

        cleanup();
        jest.useRealTimers();
    });
});

function makeFrameCodec(): FrameCodec {
    return new FrameCodec({} as ISymmetricEncryption, logger);
}
