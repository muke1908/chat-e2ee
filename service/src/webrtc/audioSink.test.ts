import { AudioSink } from './audioSink';
import { Logger } from '../utils/logger';

/** Minimal fake `<audio>` element supporting the handful of members AudioSink touches. */
function makeFakeAudioElement() {
    const attributes: Record<string, string> = {};
    return {
        setAttribute: jest.fn((name: string, value: string) => { attributes[name] = value; }),
        getAttribute: (name: string) => attributes[name],
        play: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn(),
        srcObject: null as unknown,
    };
}

describe('AudioSink', () => {
    let fakeAudioEl: ReturnType<typeof makeFakeAudioElement>;
    let createElement: jest.Mock;
    let appendChild: jest.Mock;
    let originalHTMLMediaElement: unknown;

    beforeEach(() => {
        jest.useFakeTimers();
        originalHTMLMediaElement = (globalThis as any).HTMLMediaElement;
        fakeAudioEl = makeFakeAudioElement();
        createElement = jest.fn().mockReturnValue(fakeAudioEl);
        appendChild = jest.fn();

        (globalThis as any).document = {
            createElement,
            body: { appendChild },
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as any).document;
        if (originalHTMLMediaElement) {
            (globalThis as any).HTMLMediaElement = originalHTMLMediaElement;
        } else {
            delete (globalThis as any).HTMLMediaElement;
        }
    });

    it('attach() creates an autoplaying <audio> element, sets the stream, and appends it to the DOM', async () => {
        const sink = new AudioSink(new Logger('test'));
        const stream = {} as MediaStream;

        await sink.attach(stream, 'remote');

        expect(createElement).toHaveBeenCalledWith('audio');
        expect(fakeAudioEl.setAttribute).toHaveBeenCalledWith('autoplay', 'true');
        expect(fakeAudioEl.setAttribute).toHaveBeenCalledWith('id', 'remote');
        expect(fakeAudioEl.srcObject).toBe(stream);
        expect(fakeAudioEl.play).toHaveBeenCalled();
        expect(appendChild).toHaveBeenCalledWith(fakeAudioEl);
    });

    it('attach() falls back to controls + delayed retry when autoplay is rejected', async () => {
        fakeAudioEl.play.mockRejectedValueOnce(new Error('autoplay blocked'));
        const sink = new AudioSink(new Logger('test'));

        await sink.attach({} as MediaStream, 'remote');

        expect(fakeAudioEl.setAttribute).toHaveBeenCalledWith('controls', 'true');
        expect(fakeAudioEl.play).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);
        // Flush the scheduled retry microtask.
        await Promise.resolve();

        expect(fakeAudioEl.play).toHaveBeenCalledTimes(2);
    });

    it('detach() clears srcObject and forgets the element', async () => {
        const sink = new AudioSink(new Logger('test'));
        await sink.attach({} as MediaStream, 'remote');

        sink.detach();

        expect(fakeAudioEl.srcObject).toBeNull();
        expect(fakeAudioEl.remove).toHaveBeenCalled();

        // detach() again should be a no-op and not throw.
        expect(() => sink.detach()).not.toThrow();
    });

    it('setOutputDevice() delegates to setSinkId when supported', async () => {
        const setSinkId = jest.fn().mockResolvedValue(undefined);
        const mediaElement = class {};
        (mediaElement.prototype as any).setSinkId = jest.fn();
        (globalThis as any).HTMLMediaElement = mediaElement;
        (fakeAudioEl as any).setSinkId = setSinkId;
        const sink = new AudioSink(new Logger('test'));
        await sink.attach({} as MediaStream, 'remote');

        await sink.setOutputDevice('speaker-1');

        expect(setSinkId).toHaveBeenCalledWith('speaker-1');
    });

    it('setOutputDevice() rejects clearly when the browser lacks setSinkId', async () => {
        (globalThis as any).HTMLMediaElement = class {};
        const sink = new AudioSink(new Logger('test'));
        await sink.attach({} as MediaStream, 'remote');

        await expect(sink.setOutputDevice('speaker-1')).rejects.toThrow(
            'Output device selection is not supported by this browser.',
        );
    });

    it('setOutputDevice() wraps permission or device failures without detaching audio', async () => {
        const setSinkId = jest.fn().mockRejectedValue(new Error('permission denied'));
        const mediaElement = class {};
        (mediaElement.prototype as any).setSinkId = jest.fn();
        (globalThis as any).HTMLMediaElement = mediaElement;
        (fakeAudioEl as any).setSinkId = setSinkId;
        const sink = new AudioSink(new Logger('test'));
        await sink.attach({} as MediaStream, 'remote');

        await expect(sink.setOutputDevice('speaker-1')).rejects.toThrow(
            'Unable to select the output device.',
        );
        expect(fakeAudioEl.srcObject).not.toBeNull();
    });
});
