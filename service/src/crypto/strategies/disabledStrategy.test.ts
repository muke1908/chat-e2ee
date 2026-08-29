import { createDisabledStrategy, DISABLED_STRATEGY_ID } from './disabledStrategy';
import type { EncryptionEnvelope } from '../strategy';

describe('disabled strategy (explicit no-encryption)', () => {
    it('reports its id and encrypts: false', () => {
        const strategy = createDisabledStrategy();
        expect(strategy.id).toBe(DISABLED_STRATEGY_ID);
        expect(strategy.encrypts).toBe(false);
    });

    it('produces a versioned, room-bound envelope whose `data` is the plaintext payload itself', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        const envelope = await strategy.seal(session, 'chat', 'room-1', { text: 'hello world' });

        expect(envelope.v).toBe(1);
        expect(envelope.strategy).toBe(DISABLED_STRATEGY_ID);
        expect(envelope.room).toBe('room-1');
        expect(envelope.data).toEqual({ text: 'hello world' }); // intentionally plaintext, not ciphertext
    });

    it('round-trips a payload for both channels', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');

        const envelope = await strategy.seal(session, 'signaling', 'room-1', { type: 'offer' });
        const opened = await strategy.open(session, 'signaling', 'room-1', envelope);

        expect(opened).toEqual({ type: 'offer' });
    });

    it('throws when sealing without a room id (same contract as the secure strategy)', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        await expect(strategy.seal(session, 'chat', '', { text: 'x' })).rejects.toThrow(/room id/);
    });

    it('rejects an envelope room mismatch — never accepts a plaintext payload for the wrong room', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        const envelope = await strategy.seal(session, 'chat', 'room-1', { text: 'hi' });

        await expect(strategy.open(session, 'chat', 'room-2', envelope)).rejects.toThrow(/room/i);
    });

    it('rejects an unsupported envelope version — no silent fallback to "assume compatible"', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        const envelope = await strategy.seal(session, 'chat', 'room-1', { text: 'hi' });
        const tampered: EncryptionEnvelope = { ...envelope, v: 2 };

        await expect(strategy.open(session, 'chat', 'room-1', tampered)).rejects.toThrow(/version/i);
    });

    it('rejects an envelope produced by a different strategy id, even though there is no ciphertext to fail authentication', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        const foreign: EncryptionEnvelope = { v: 1, strategy: 'some-other-strategy', room: 'room-1', data: { text: 'hi' } };

        await expect(strategy.open(session, 'chat', 'room-1', foreign)).rejects.toThrow(/Unsupported encryption strategy/);
    });

    it('rejects a non-object envelope without a fallback', async () => {
        const strategy = createDisabledStrategy();
        const session = await strategy.createSession('unused-secret', 'room-1');
        await expect(strategy.open(session, 'chat', 'room-1', null as unknown as EncryptionEnvelope)).rejects.toThrow(/expected an object/);
    });

    it('does not require a real secret — createSession() succeeds even with an empty string', async () => {
        const strategy = createDisabledStrategy();
        await expect(strategy.createSession('', 'room-1')).resolves.toBeNull();
    });
});
