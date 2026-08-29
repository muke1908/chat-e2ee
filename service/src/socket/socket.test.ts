const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
};

const socketIOClient = jest.fn((..._args: unknown[]) => mockSocket);

jest.mock('socket.io-client', () => ({
    __esModule: true,
    default: (...args: unknown[]) => socketIOClient(...args),
}));

jest.mock('../configContext', () => ({
    configContext: () => ({ baseUrl: 'http://localhost:3000' }),
}));

import { SocketInstance, SubscriptionType } from './socket';

const createLogger = (): any => {
    const logger: any = {
        log: jest.fn(),
        withInvocationId: jest.fn(() => logger),
        createChild: jest.fn(() => createLogger()),
    };
    return logger;
};

const handlerFor = (event: string): ((...args: unknown[]) => void) => {
    const registration = mockSocket.on.mock.calls.find(([name]) => name === event);
    if (!registration) {
        throw new Error(`No handler registered for "${event}"`);
    }
    return registration[1] as (...args: unknown[]) => void;
};

describe('SocketInstance', () => {
    let logger: any;
    let subscription: SubscriptionType;
    const subscriptionContext = () => subscription;
    let rawHandlers: { onRawChatMessage: jest.Mock; onRawWebrtcSignal: jest.Mock };
    const createInstance = () => new SocketInstance(subscriptionContext, logger, rawHandlers);

    beforeEach(() => {
        jest.clearAllMocks();
        logger = createLogger();
        subscription = new Map();
        rawHandlers = { onRawChatMessage: jest.fn(), onRawWebrtcSignal: jest.fn() };
    });

    describe('constructor', () => {
        it('connects to the base url provided by configContext', () => {
            createInstance();
            expect(socketIOClient).toHaveBeenCalledWith('http://localhost:3000/');
        });

        it('registers a listener for each of the six wire events', () => {
            createInstance();
            const registeredEvents = mockSocket.on.mock.calls.map(([name]) => name);
            expect(registeredEvents).toEqual(
                expect.arrayContaining([
                    'limit-reached',
                    'delivered',
                    'on-alice-join',
                    'on-alice-disconnect',
                    'chat-message',
                    'webrtc-session-description',
                ]),
            );
            expect(mockSocket.on).toHaveBeenCalledTimes(6);
        });
    });

    describe('incoming events (unencrypted, no processing needed)', () => {
        it('forwards the event to a subscribed callback', () => {
            const callback = jest.fn();
            subscription.set('on-alice-join', new Set([callback]));
            createInstance();

            handlerFor('on-alice-join')(null);

            expect(callback).toHaveBeenCalledWith(null);
        });

        it('ignores events that have no subscribers', () => {
            createInstance();
            expect(() => handlerFor('delivered')('payload')).not.toThrow();
        });

        it('notifies every callback subscribed to the same event', () => {
            const first = jest.fn();
            const second = jest.fn();
            subscription.set('limit-reached', new Set([first, second]));
            createInstance();

            handlerFor('limit-reached')(null);

            expect(first).toHaveBeenCalled();
            expect(second).toHaveBeenCalled();
        });
    });

    describe('incoming chat-message (still-encrypted, routed to onRawChatMessage)', () => {
        it('hands the raw envelope to onRawChatMessage without touching the generic subscription map', () => {
            createInstance();
            const raw = { id: 1, timestamp: 123, sender: 'alice', envelope: { v: 1, room: 'r', iv: 'i', ct: 'c' } };

            handlerFor('chat-message')(raw);

            expect(rawHandlers.onRawChatMessage).toHaveBeenCalledWith(raw);
        });

        it('acknowledges delivery by emitting "received" with just the message id', () => {
            createInstance();

            handlerFor('chat-message')({ id: 'msg-1', timestamp: 1, sender: 'alice', envelope: {} });

            expect(mockSocket.emit).toHaveBeenCalledWith('received', { id: 'msg-1' });
        });
    });

    describe('incoming webrtc-session-description (still-encrypted, routed to onRawWebrtcSignal)', () => {
        it('hands the raw envelope to onRawWebrtcSignal', () => {
            createInstance();
            const raw = { envelope: { v: 1, room: 'r', iv: 'i', ct: 'c' } };

            handlerFor('webrtc-session-description')(raw);

            expect(rawHandlers.onRawWebrtcSignal).toHaveBeenCalledWith(raw);
        });
    });

    describe('joinChat()', () => {
        it('emits "chat-join" with only channelID/userID — no key material', () => {
            const payload = { channelID: 'chan-1', userID: 'alice' };
            createInstance().joinChat(payload);
            expect(mockSocket.emit).toHaveBeenCalledWith('chat-join', payload);
        });
    });

    describe('sendChatMessage()', () => {
        it('emits "chat-message" with the envelope and resolves with the ack payload', async () => {
            mockSocket.emit.mockImplementation((_event, _payload, ack) => ack({ id: 5, timestamp: 999 }));
            const instance = createInstance();

            const result = await instance.sendChatMessage({ v: 1, room: 'r', iv: 'i', ct: 'c' });

            expect(mockSocket.emit).toHaveBeenCalledWith('chat-message', { envelope: { v: 1, room: 'r', iv: 'i', ct: 'c' } }, expect.any(Function));
            expect(result).toEqual({ id: 5, timestamp: 999 });
        });

        it('rejects when the server ack carries an error', async () => {
            mockSocket.emit.mockImplementation((_event, _payload, ack) => ack({ error: 'Rate limit exceeded' }));
            const instance = createInstance();

            await expect(instance.sendChatMessage({ v: 1, room: 'r', iv: 'i', ct: 'c' })).rejects.toThrow('Rate limit exceeded');
        });
    });

    describe('sendWebrtcSignal()', () => {
        it('emits "webrtc-signal" with the envelope', async () => {
            mockSocket.emit.mockImplementation((_event, _payload, ack) => ack({ status: 'ok' }));
            const instance = createInstance();

            await instance.sendWebrtcSignal({ v: 1, room: 'r', iv: 'i', ct: 'c' });

            expect(mockSocket.emit).toHaveBeenCalledWith('webrtc-signal', { envelope: { v: 1, room: 'r', iv: 'i', ct: 'c' } }, expect.any(Function));
        });

        it('rejects when the server ack carries an error', async () => {
            mockSocket.emit.mockImplementation((_event, _payload, ack) => ack({ error: 'No receiver is in the channel' }));
            const instance = createInstance();

            await expect(instance.sendWebrtcSignal({ v: 1, room: 'r', iv: 'i', ct: 'c' })).rejects.toThrow('No receiver is in the channel');
        });
    });

    describe('dispose()', () => {
        it('disconnects the socket', () => {
            createInstance().dispose();
            expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
        });
    });
});
