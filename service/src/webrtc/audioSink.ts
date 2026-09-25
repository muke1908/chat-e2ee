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
        this.detach();
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

    public async setOutputDevice(deviceId: string): Promise<void> {
        if (!this.audioEl) {
            throw new Error('No remote audio element is available for output device selection.');
        }

        // setSinkId is not available in every browser and may also require a
        // secure context and permission for the selected output device.
        if (typeof HTMLMediaElement === 'undefined' || !('setSinkId' in HTMLMediaElement.prototype)) {
            throw new Error('Output device selection is not supported by this browser.');
        }

        const audioElement = this.audioEl as HTMLAudioElement & {
            setSinkId: (sinkId: string) => Promise<void>;
        };
        try {
            await audioElement.setSinkId(deviceId);
        } catch (error) {
            this.logger.log('Failed to set output device:', error);
            const outputDeviceError = new Error(
                'Unable to select the output device. Check browser permissions, device availability, and secure-context requirements.',
            );
            (outputDeviceError as Error & { cause?: unknown }).cause = error;
            throw outputDeviceError;
        }
    }

    public detach(): void {
        if (this.audioEl) {
            const audioElement = this.audioEl;
            audioElement.srcObject = null;
            audioElement.remove();
            this.audioEl = undefined;
        }
    }
}
