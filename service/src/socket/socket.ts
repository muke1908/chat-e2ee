import socketIOClient, { Socket } from 'socket.io-client';
import { Logger } from '../utils/logger';
import { chatJoinPayloadType } from '../sdk';
import { configContext } from '../configContext';
export type SubscriptionType = Map<SOCKET_LISTENERS, Set<(...args: any) => void>>;
export type SubscriptionContextType = () => SubscriptionType;

export const enum SOCKET_LISTENERS {
    'LIMIT_REACHED' = 'limit-reached',
    'DELIVERED' = 'delivered',
    'ON_ALICE_JOIN' = 'on-alice-join',
    'ON_ALICE_DISCONNECT' = 'on-alice-disconnect',
    'CHAT_MESSAGE' = 'chat-message'
}

const getBaseURL = (): string => {
    const { socketURL } = configContext();
    const BASE_URI = socketURL || (process.env.NODE_ENV === "production" ? 'https://chat-e2ee-2.azurewebsites.net' : '');
    return BASE_URI;
}

export class SocketInstance {
    private socket: Socket;
    constructor(private subscriptionContext: SubscriptionContextType, private logger: Logger) {
        this.socket = socketIOClient(`${getBaseURL}/`);
        this.socket.on(SOCKET_LISTENERS.LIMIT_REACHED, (...args) => this.handler(SOCKET_LISTENERS.LIMIT_REACHED, args));
        this.socket.on(SOCKET_LISTENERS.DELIVERED, (...args) => this.handler(SOCKET_LISTENERS.DELIVERED, args));
        this.socket.on(SOCKET_LISTENERS.ON_ALICE_JOIN, (...args) => this.handler(SOCKET_LISTENERS.ON_ALICE_JOIN, args));
        this.socket.on(SOCKET_LISTENERS.ON_ALICE_DISCONNECT, (...args) => this.handler(SOCKET_LISTENERS.ON_ALICE_DISCONNECT, args));
        this.socket.on(SOCKET_LISTENERS.CHAT_MESSAGE, (...args) => {
            this.handler(SOCKET_LISTENERS.CHAT_MESSAGE, args);
            this.markDelivered(args[0]);
        });
        logger.log('Initiialized');
    }

    public joinChat(payload: chatJoinPayloadType): void {
        const { publicKey, ...rest } = payload;
        this.logger.log(`joinChat, publicKey removed from log, ${JSON.stringify(rest)}`);
        this.socket.emit('chat-join', payload)
    }

    public dispose(): void {
        this.logger.log(`disconnect()`);
        this.socket.disconnect();
    }

    private handler(listener: SOCKET_LISTENERS, args) {
        this.logger.log(`handler called for ${listener}`);
        const callbacks = this.subscriptionContext().get(listener);
        callbacks?.forEach(fn => fn(...args));
    }

    private markDelivered(msg) {
        this.logger.log(`markDelivered()`);
        this.socket.emit('received', { channel: msg.channel, sender: msg.sender, id: msg.id })
    }
}