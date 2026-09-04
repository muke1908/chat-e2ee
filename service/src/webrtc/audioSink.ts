import { Logger } from "../utils/logger";

/**
 * Attaches/detaches a MediaStream to a hidden `<audio>` element in the DOM so
 * remote audio actually plays back. Extracted from Peer to isolate the only
 * DOM-touching code in the WebRTC call path, making it possible to fake/mock
 * in tests without a real DOM.
 */
export class AudioSink {
    private audioEl?: HTMLAudioElement;

    constructor(private logger: Logger) {}

    public async attach(stream: MediaStream, tag: string): Promise<void> {
        this.logger.log('Adding remote audio track');
        this.audioEl = document.createElement('audio');
        this.audioEl.setAttribute('autoplay', 'true');
        this.audioEl.setAttribute('id', tag);
        this.audioEl.srcObject = stream;

        try {
            await this.audioEl.play();
        } catch (err) {
            this.logger.log(err);
            this.audioEl.setAttribute('controls', 'true');
            setTimeout(() => {
                this.logger.log('Scheduling delay play');
                this.audioEl?.play();
            }, 1000);
        }
        document.body.appendChild(this.audioEl);
    }

    public detach(): void {
        if (this.audioEl) {
            this.audioEl.srcObject = null;
            this.audioEl = undefined;
        }
    }

    public async setOutputDevice(deviceId: string): Promise<void> {
        if (!this.audioEl) {
            return;
        }
        const audioWithSink = this.audioEl as HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };
        if (typeof audioWithSink.setSinkId !== 'function') {
            throw new Error('Audio output device selection is not supported in this browser.');
        }
        await audioWithSink.setSinkId(deviceId);
    }
}
