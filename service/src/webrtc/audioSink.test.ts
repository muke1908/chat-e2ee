import { AudioSink } from './audioSink';
import { Logger } from '../utils/logger';

/** Minimal fake `<audio>` element supporting the handful of members AudioSink touches. */
function makeFakeAudioElement() {
    const attributes: Record<string, string> = {};
    return {
        setAttribute: jest.fn((name: string, value: string) => { attributes[name] = value; }),
        getAttribute: (name: string) => attributes[name],
        play: jest.fn().mockResolvedValue(undefined),
        srcObject: null as unknown,
    };
}

describe('AudioSink', () => {
    let fakeAudioEl: ReturnType<typeof makeFakeAudioElement>;
    let createElement: jest.Mock;
    let appendChild: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
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

        // detach() again should be a no-op and not throw.
        expect(() => sink.detach()).not.toThrow();
    });
});
