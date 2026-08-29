import socketIOClient, { Socket } from 'socket.io-client';
import { configContext } from '../configContext';
import { Logger } from '../utils/logger';
import type { chatJoinPayloadType } from '../public/types';
import type { EncryptionEnvelope } from '../crypto/strategy';

/** Public, consumer-facing event names accepted by `IChatE2EE.on()`. */
export type SocketListenerType = "limit-reached" | "delivered" | "on-alice-join" | "on-alice-disconnect" | "chat-message";

export type SubscriptionType = Map<string, Set<Function>>;
export type SubscriptionContextType = () => SubscriptionType;

/** Still-encrypted chat message as received from the wire. */
export type RawChatMessage = { id: number; timestamp: number; sender: string; envelope: EncryptionEnvelope };
/** Still-encrypted WebRTC signaling envelope as received from the wire. */
export type RawSignalMessage = { envelope: EncryptionEnvelope };

/**
 * Raw, still-encrypted payloads are handed to these callbacks instead of
 * going through the generic subscription map: the SDK must decrypt them
 * first (strict version/room checks, replay protection) before any consumer
 * ever sees `chat-message`/call-signal data. This keeps `SocketInstance`
 * ignorant of key material — it only ever relays opaque envelopes.
 */
export interface SocketRawHandlers {
    onRawChatMessage: (msg: RawChatMessage) => void;
    onRawWebrtcSignal: (msg: RawSignalMessage) => void;
}

const WIRE_EVENTS = {
    LIMIT_REACHED: 'limit-reached',
    DELIVERED: 'delivered',
    ON_ALICE_JOIN: 'on-alice-join',
    ON_ALICE_DISCONNECT: 'on-alice-disconnect',
    CHAT_MESSAGE: 'chat-message',
    WEBRTC_SIGNAL: 'webrtc-session-description',
} as const;

type AckError = { error: string };

export class SocketInstance {
    private socket: Socket;
    private eventHandlerLogger: Logger;

    constructor(
        private subscriptionContext: () => SubscriptionType,
        private logger: Logger,
        private rawHandlers: SocketRawHandlers,
    ) {
        this.eventHandlerLogger = this.logger.createChild('eventHandlerLogger');
        this.socket = socketIOClient(`${configContext().baseUrl}/`);
        this.socket.on(WIRE_EVENTS.LIMIT_REACHED, (...args) => this.handler('limit-reached', args));
        this.socket.on(WIRE_EVENTS.DELIVERED, (...args) => this.handler('delivered', args));
        this.socket.on(WIRE_EVENTS.ON_ALICE_JOIN, (...args) => this.handler('on-alice-join', args));
        this.socket.on(WIRE_EVENTS.ON_ALICE_DISCONNECT, (...args) => this.handler('on-alice-disconnect', args));
        this.socket.on(WIRE_EVENTS.CHAT_MESSAGE, (msg: RawChatMessage) => {
            this.rawHandlers.onRawChatMessage(msg);
            this.markDelivered(msg);
        });
        this.socket.on(WIRE_EVENTS.WEBRTC_SIGNAL, (msg: RawSignalMessage) => {
            this.rawHandlers.onRawWebrtcSignal(msg);
        });
        logger.log('Initiialized');
    }

    /** Join a room. Carries no key material — the shared secret never leaves the device. */
    public joinChat(payload: chatJoinPayloadType): void {
        this.logger.log(`joinChat(), ${JSON.stringify(payload)}`);
        this.socket.emit('chat-join', payload);
    }

    /** Send an already-sealed chat envelope; resolves with the server-assigned id/timestamp. */
    public sendChatMessage(envelope: EncryptionEnvelope): Promise<{ id: number; timestamp: number }> {
        return this.emitWithAck<{ id: number; timestamp: number }>('chat-message', { envelope });
    }

    /** Send an already-sealed WebRTC signaling envelope. */
    public async sendWebrtcSignal(envelope: EncryptionEnvelope): Promise<void> {
        await this.emitWithAck<{ status: string }>('webrtc-signal', { envelope });
    }

    public dispose(): void {
        this.logger.log(`disconnect()`);
        this.socket.disconnect();
    }

    private emitWithAck<T>(event: string, payload: unknown): Promise<T> {
        return new Promise((resolve, reject) => {
            this.socket.emit(event, payload, (response: (T & Partial<AckError>) | AckError) => {
                if (response && typeof response === 'object' && 'error' in response && response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response as T);
            });
        });
    }

    private handler(listener: SocketListenerType, args: unknown[]): void {
        const loggerWithInvocationId = this.eventHandlerLogger.withInvocationId();
        loggerWithInvocationId.log(`handler called for ${listener}`);
        const callbacks = this.subscriptionContext().get(listener);
        callbacks?.forEach(fn => fn(...args));
    }

    private markDelivered(msg: RawChatMessage): void {
        this.logger.log(`markDelivered()`);
        this.socket.emit('received', { id: msg.id });
    }
}
