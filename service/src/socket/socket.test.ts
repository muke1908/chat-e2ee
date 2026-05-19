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
        count: jest.fn(() => logger),
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

const loggedMessages = (logger: any): string =>
    logger.log.mock.calls.map((call: unknown[]) => String(call[0])).join(' ');

describe('SocketInstance', () => {
    let logger: any;
    let subscription: SubscriptionType;
    const subscriptionContext = () => subscription;
    const createInstance = () => new SocketInstance(subscriptionContext, logger);

    beforeEach(() => {
        jest.clearAllMocks();
        logger = createLogger();
        subscription = new Map();
    });

    describe('constructor', () => {
        it('connects to the base url provided by configContext', () => {
            createInstance();
            expect(socketIOClient).toHaveBeenCalledWith('http://localhost:3000/');
        });

        it('registers a listener for each of the six socket events', () => {
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

    describe('incoming events', () => {
        it('forwards the event to a subscribed callback', () => {
            const callback = jest.fn();
            subscription.set('on-alice-join', new Set([callback]));
            createInstance();

            handlerFor('on-alice-join')('payload');

            expect(callback).toHaveBeenCalledWith('payload');
        });

        it('ignores events that have no subscribers', () => {
            createInstance();
            expect(() => handlerFor('delivered')('payload')).not.toThrow();
        });

        it('notifies every callback subscribed to the same event', () => {
            const first = jest.fn();
            const second = jest.fn();
            subscription.set('chat-message', new Set([first, second]));
            createInstance();

            handlerFor('chat-message')({ channel: 'c', sender: 's', id: 'i' });

            expect(first).toHaveBeenCalled();
            expect(second).toHaveBeenCalled();
        });

        it('acknowledges an incoming chat-message by emitting "received"', () => {
            createInstance();

            handlerFor('chat-message')({ channel: 'chan-1', sender: 'alice', id: 'msg-1' });

            expect(mockSocket.emit).toHaveBeenCalledWith('received', {
                channel: 'chan-1',
                sender: 'alice',
                id: 'msg-1',
            });
        });
    });

    describe('joinChat()', () => {
        const payload = {
            channel: 'chan-1',
            from: 'alice',
            sessionId: 'sess-1',
            publicKey: 'SECRET_KEY',
        } as any;

        it('emits "chat-join" with the payload', () => {
            createInstance().joinChat(payload);
            expect(mockSocket.emit).toHaveBeenCalledWith('chat-join', payload);
        });

        it('never logs the public key', () => {
            createInstance().joinChat(payload);
            expect(loggedMessages(logger)).not.toContain('SECRET_KEY');
        });
    });

    describe('dispose()', () => {
        it('disconnects the socket', () => {
            createInstance().dispose();
            expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
        });
    });
});