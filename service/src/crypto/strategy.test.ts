import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { KeyExchangeManager, type EncryptionEnvelope, type EncryptionStrategy } from './strategy';

/**
 * Fake strategy used purely to observe delegation: every call is recorded
 * and forwarded through jest mocks so tests can assert `KeyExchangeManager`
 * calls the strategy with the right arguments, at the right time, and never
 * bypasses it.
 */
function buildFakeStrategy(overrides: Partial<EncryptionStrategy<{ secret: string; roomId: string }>> = {}): {
    strategy: EncryptionStrategy<{ secret: string; roomId: string }>;
    createSession: jest.Mock;
    seal: jest.Mock;
    open: jest.Mock;
} {
    const createSession = jest.fn(async (secret: string, roomId: string) => ({ secret, roomId }));
    const seal = jest.fn(async (session: { secret: string; roomId: string }, channel: string, room: string, payload: unknown): Promise<EncryptionEnvelope> => ({
        v: 1,
        strategy: 'fake-strategy',
        room,
        data: { channel, session, payload },
    }));
    const open = jest.fn(async (_session: unknown, _channel: string, _room: string, envelope: EncryptionEnvelope) => (envelope.data as any).payload);

    const strategy: EncryptionStrategy<{ secret: string; roomId: string }> = {
        id: 'fake-strategy',
        encrypts: true,
        createSession,
        seal,
        open,
        ...overrides,
    };
    return { strategy, createSession, seal, open };
}

describe('KeyExchangeManager', () => {
    describe('lifecycle', () => {
        it('is not ready before begin() is called', () => {
            const { strategy } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            expect(manager.isReady).toBe(false);
        });

        it('becomes ready once begin() resolves', async () => {
            const { strategy } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret', 'room-1');
            expect(manager.isReady).toBe(true);
        });

        it('exposes the configured strategy id and encrypts flag', () => {
            const { strategy } = buildFakeStrategy({ id: 'my-strategy', encrypts: false });
            const manager = new KeyExchangeManager(strategy);
            expect(manager.strategyId).toBe('my-strategy');
            expect(manager.encrypts).toBe(false);
        });

        it('reset() tears the session down; isReady becomes false again', async () => {
            const { strategy } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret', 'room-1');
            expect(manager.isReady).toBe(true);

            manager.reset();
            expect(manager.isReady).toBe(false);
        });

        it('begin() throws without a roomId, and never calls the strategy', async () => {
            const { strategy, createSession } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await expect(manager.begin('secret', '')).rejects.toThrow(/roomId/);
            expect(createSession).not.toHaveBeenCalled();
        });

        it('seal()/open() throw "not ready" before begin(), and after reset()', async () => {
            const { strategy } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await expect(manager.seal('chat', { hello: 'world' })).rejects.toThrow(/not ready/i);
            await expect(manager.open('chat', { v: 1, strategy: 'fake-strategy', room: 'r', data: {} })).rejects.toThrow(/not ready/i);

            await manager.begin('secret', 'room-1');
            manager.reset();
            await expect(manager.seal('chat', { hello: 'world' })).rejects.toThrow(/not ready/i);
        });

        it('begin() called again establishes a brand new session (old one is discarded)', async () => {
            const { strategy, createSession } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret-a', 'room-a');
            await manager.begin('secret-b', 'room-b');

            expect(createSession).toHaveBeenNthCalledWith(1, 'secret-a', 'room-a');
            expect(createSession).toHaveBeenNthCalledWith(2, 'secret-b', 'room-b');

            const envelope = await manager.seal('chat', { x: 1 });
            expect(envelope.room).toBe('room-b');
        });
    });

    describe('delegation', () => {
        it('begin() delegates to strategy.createSession() with the given secret/roomId', async () => {
            const { strategy, createSession } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('my-secret', 'room-42');
            expect(createSession).toHaveBeenCalledWith('my-secret', 'room-42');
        });

        it('seal() delegates to strategy.seal() with the active session/channel/room/payload', async () => {
            const { strategy, seal } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('my-secret', 'room-42');

            const payload = { text: 'hi' };
            const envelope = await manager.seal('chat', payload);

            expect(seal).toHaveBeenCalledWith({ secret: 'my-secret', roomId: 'room-42' }, 'chat', 'room-42', payload);
            expect(envelope.room).toBe('room-42');
        });

        it('open() delegates to strategy.open() with the active session/channel/room/envelope', async () => {
            const { strategy, seal, open } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('my-secret', 'room-42');

            const sealed = await manager.seal('signaling', { kind: 'offer' });
            const opened = await manager.open('signaling', sealed);

            expect(open).toHaveBeenCalledWith({ secret: 'my-secret', roomId: 'room-42' }, 'signaling', 'room-42', sealed);
            expect(opened).toEqual({ kind: 'offer' });
            expect(seal).toHaveBeenCalledTimes(1);
        });

        it('open() rejects an envelope from a different strategy id before ever calling strategy.open() (no cross-strategy fallback)', async () => {
            const { strategy, open } = buildFakeStrategy({ id: 'expected-strategy' });
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret', 'room-1');

            const foreignEnvelope: EncryptionEnvelope = { v: 1, strategy: 'some-other-strategy', room: 'room-1', data: {} };
            await expect(manager.open('chat', foreignEnvelope)).rejects.toThrow(/expected-strategy[\s\S]*some-other-strategy/);
            expect(open).not.toHaveBeenCalled();
        });

        it('open() rejects a non-object envelope without delegating to the strategy', async () => {
            const { strategy, open } = buildFakeStrategy();
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret', 'room-1');

            await expect(manager.open('chat', null as unknown as EncryptionEnvelope)).rejects.toThrow(/expected an object/);
            expect(open).not.toHaveBeenCalled();
        });

        it('propagates errors thrown by the strategy itself (e.g. failed auth tag) without swallowing them', async () => {
            const failingOpen = jest.fn().mockRejectedValue(new Error('boom: auth tag mismatch'));
            const { strategy } = buildFakeStrategy({ open: failingOpen });
            const manager = new KeyExchangeManager(strategy);
            await manager.begin('secret', 'room-1');

            const envelope: EncryptionEnvelope = { v: 1, strategy: 'fake-strategy', room: 'room-1', data: {} };
            await expect(manager.open('chat', envelope)).rejects.toThrow('boom: auth tag mismatch');
        });
    });
});
