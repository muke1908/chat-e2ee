/**
 * Unit tests for SocketInstance (issue #311)
 *
 * SocketInstance wraps socket.io-client and bridges socket events to the
 * subscription map owned by ChatE2EE. All socket.io-client calls are mocked
 * so no real network is required.
 */

// ─── Polyfills (mirrors crypto.test.ts setup) ────────────────────────────────
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

// ─── Mock socket.io-client ────────────────────────────────────────────────────
// We build a fake socket object whose .on() and .emit() methods we can inspect,
// then return it from the mocked socketIOClient factory.

type FakeHandler = (...args: any[]) => void;

const mockSocketOn = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketDisconnect = jest.fn();

const fakeSocket = {
    on: mockSocketOn,
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect,
    // Helpers used in tests to fire server-side events into the instance
    _handlers: new Map<string, FakeHandler>(),
    fire(event: string, ...args: any[]) {
        const handler = this._handlers.get(event);
        if (handler) handler(...args);
    },
};

// Capture handlers registered via socket.on() so tests can trigger them
mockSocketOn.mockImplementation((event: string, handler: FakeHandler) => {
    fakeSocket._handlers.set(event, handler);
});

jest.mock('socket.io-client', () => ({
    __esModule: true,
    default: jest.fn(() => fakeSocket),
    Socket: jest.fn(),
}));

// ─── Mock configContext ───────────────────────────────────────────────────────
jest.mock('../configContext', () => ({
    configContext: () => ({
        baseUrl: 'http://localhost:3001',
        settings: { disableLog: true },
    }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { SocketInstance, SubscriptionType, SocketListenerType } from './socket';
import { Logger } from '../utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeSubscriptions(
    listeners: SocketListenerType[] = []
): SubscriptionType {
    const map: SubscriptionType = new Map();
    listeners.forEach((l) => map.set(l, new Set()));
    return map;
}

function makeLogger(): Logger {
    const logger = new Logger('test');
    return logger;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('SocketInstance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fakeSocket._handlers.clear();
        // Re-attach handler capture after clearAllMocks resets mockSocketOn
        mockSocketOn.mockImplementation((event: string, handler: FakeHandler) => {
            fakeSocket._handlers.set(event, handler);
        });
    });

    // ── Construction ─────────────────────────────────────────────────────────

    describe('constructor', () => {
        it('registers handlers for all six socket events', () => {
            const subs = makeSubscriptions();
            new SocketInstance(() => subs, makeLogger());

            const registeredEvents = [...fakeSocket._handlers.keys()];
            expect(registeredEvents).toEqual(
                expect.arrayContaining([
                    'limit-reached',
                    'delivered',
                    'on-alice-join',
                    'on-alice-disconnect',
                    'chat-message',
                    'webrtc-session-description',
                ])
            );
            expect(registeredEvents).toHaveLength(6);
        });

        it('connects to the URL returned by configContext', () => {
            const socketIOClient = require('socket.io-client').default;
            const subs = makeSubscriptions();
            new SocketInstance(() => subs, makeLogger());

            expect(socketIOClient).toHaveBeenCalledWith('http://localhost:3001/');
        });
    });

    // ── joinChat ──────────────────────────────────────────────────────────────

    describe('joinChat()', () => {
        it('emits a "chat-join" event with the full payload', () => {
            const subs = makeSubscriptions();
            const instance = new SocketInstance(() => subs, makeLogger());

            const payload = {
                channelID: 'channel-abc',
                userID: 'user-123',
                publicKey: 'rsa-public-key',
            };
            instance.joinChat(payload);

            expect(mockSocketEmit).toHaveBeenCalledWith('chat-join', payload);
        });
    });

    // ── dispose ───────────────────────────────────────────────────────────────

    describe('dispose()', () => {
        it('calls socket.disconnect()', () => {
            const subs = makeSubscriptions();
            const instance = new SocketInstance(() => subs, makeLogger());

            instance.dispose();

            expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
        });
    });

    // ── Event routing (handler) ───────────────────────────────────────────────

    describe('event routing', () => {
        const routedEvents: SocketListenerType[] = [
            'limit-reached',
            'delivered',
            'on-alice-join',
            'on-alice-disconnect',
            'webrtc-session-description',
        ];

        routedEvents.forEach((event) => {
            it(`routes "${event}" to registered subscription callbacks`, () => {
                const callback = jest.fn();
                const subs = makeSubscriptions([event]);
                subs.get(event)!.add(callback);

                new SocketInstance(() => subs, makeLogger());
                fakeSocket.fire(event, { data: 'payload' });

                expect(callback).toHaveBeenCalledTimes(1);
                expect(callback).toHaveBeenCalledWith({ data: 'payload' });
            });
        });

        it('calls all callbacks when multiple subscribers exist for an event', () => {
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            const subs = makeSubscriptions(['on-alice-join']);
            subs.get('on-alice-join')!.add(cb1);
            subs.get('on-alice-join')!.add(cb2);

            new SocketInstance(() => subs, makeLogger());
            fakeSocket.fire('on-alice-join');

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        it('does not throw when no subscribers exist for a fired event', () => {
            const subs = makeSubscriptions(); // empty map
            new SocketInstance(() => subs, makeLogger());

            expect(() => fakeSocket.fire('limit-reached')).not.toThrow();
        });
    });

    // ── "chat-message" special handling ──────────────────────────────────────

    describe('"chat-message" event', () => {
        it('routes the message to subscription callbacks', () => {
            const callback = jest.fn();
            const subs = makeSubscriptions(['chat-message']);
            subs.get('chat-message')!.add(callback);

            new SocketInstance(() => subs, makeLogger());

            const msg = { channel: 'ch-1', sender: 'user-1', id: 'msg-42', text: 'hi' };
            fakeSocket.fire('chat-message', msg);

            expect(callback).toHaveBeenCalledWith(msg);
        });

        it('emits a "received" acknowledgement after delivering the message', () => {
            const subs = makeSubscriptions(['chat-message']);
            new SocketInstance(() => subs, makeLogger());

            const msg = { channel: 'ch-1', sender: 'user-1', id: 'msg-42' };
            fakeSocket.fire('chat-message', msg);

            expect(mockSocketEmit).toHaveBeenCalledWith('received', {
                channel: 'ch-1',
                sender: 'user-1',
                id: 'msg-42',
            });
        });

        it('delivers message before emitting "received"', () => {
            const order: string[] = [];
            const callback = jest.fn(() => order.push('callback'));
            mockSocketEmit.mockImplementation((event: string) => {
                if (event === 'received') order.push('received');
            });

            const subs = makeSubscriptions(['chat-message']);
            subs.get('chat-message')!.add(callback);
            new SocketInstance(() => subs, makeLogger());

            fakeSocket.fire('chat-message', { channel: 'c', sender: 's', id: '1' });

            expect(order).toEqual(['callback', 'received']);
        });
    });

    // ── subscriptionContext reactivity ────────────────────────────────────────

    describe('subscriptionContext reactivity', () => {
        it('reads the subscription map lazily on each event', () => {
            const subs: SubscriptionType = new Map();
            new SocketInstance(() => subs, makeLogger());

            // Register a callback AFTER construction
            const lateCallback = jest.fn();
            subs.set('delivered', new Set([lateCallback]));

            fakeSocket.fire('delivered', 'some-data');

            expect(lateCallback).toHaveBeenCalledWith('some-data');
        });
    });
});