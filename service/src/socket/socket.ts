import socketIOClient, { Socket } from 'socket.io-client';
import { chatJoinPayloadType } from '../sdk';
export type SubscriptionType = Map<SOCKET_LISTENERS, Set<(...args : any)=>void>>;
export type SubscriptionContextType = () => SubscriptionType;

export const enum SOCKET_LISTENERS  {
    'LIMIT_REACHED' = 'limit-reached',
    'DELIVERED' = 'delivered',
    'ON_ALICE_JOIN' = 'on-alice-join',
    'ON_ALICE_DISCONNECT' = 'on-alice-disconnect',
    'CHAT_MESSAGE' = 'chat-message' 
}

export class SocketInstance {
    private socket: Socket;
    constructor(private subscriptionContext: SubscriptionContextType) {
        this.socket = socketIOClient('/');
        this.socket.on(SOCKET_LISTENERS.LIMIT_REACHED, (...args) => this.addHandler(SOCKET_LISTENERS.LIMIT_REACHED, args));
        this.socket.on(SOCKET_LISTENERS.DELIVERED, (...args) => this.addHandler(SOCKET_LISTENERS.DELIVERED, args));
        this.socket.on(SOCKET_LISTENERS.ON_ALICE_JOIN, (...args) => this.addHandler(SOCKET_LISTENERS.ON_ALICE_JOIN, args));
        this.socket.on(SOCKET_LISTENERS.ON_ALICE_DISCONNECT, (...args) => this.addHandler(SOCKET_LISTENERS.ON_ALICE_DISCONNECT, args));
        this.socket.on(SOCKET_LISTENERS.CHAT_MESSAGE, (...args) => {
            this.addHandler(SOCKET_LISTENERS.CHAT_MESSAGE, args);
            this.markDelivered(args[0]);
        });
    }

    public joinChat(payload: chatJoinPayloadType): void {
        this.socket.emit('chat-join', payload)
    }

    public dispose(): void {
        this.socket.disconnect();
    }

    private addHandler(listener: SOCKET_LISTENERS, args) {
        const callbacks = this.subscriptionContext().get(listener);
        callbacks?.forEach(fn => fn(...args));
    }

    private markDelivered(msg) {
        this.socket.emit('received', { channel: msg.channel, sender: msg.sender, id: msg.id })
    }
}