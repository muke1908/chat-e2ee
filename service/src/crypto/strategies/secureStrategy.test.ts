import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { generateInviteSecret } from '../inviteCrypto';
import { createSecureStrategy, SECURE_STRATEGY_ID } from './secureStrategy';
import type { EncryptionEnvelope } from '../strategy';

describe('secure strategy (invite-secret HKDF + AES-256-GCM)', () => {
    it('reports its id and encrypts: true', () => {
        const strategy = createSecureStrategy();
        expect(strategy.id).toBe(SECURE_STRATEGY_ID);
        expect(strategy.encrypts).toBe(true);
    });

    it('round-trips a payload for both channels, each under its own domain-separated key', async () => {
        const strategy = createSecureStrategy();
        const session = await strategy.createSession(generateInviteSecret(), 'room-1');

        const chatEnvelope = await strategy.seal(session, 'chat', 'room-1', { text: 'hi' });
        const signalingEnvelope = await strategy.seal(session, 'signaling', 'room-1', { type: 'offer' });

        expect(await strategy.open(session, 'chat', 'room-1', chatEnvelope)).toEqual({ text: 'hi' });
        expect(await strategy.open(session, 'signaling', 'room-1', signalingEnvelope)).toEqual({ type: 'offer' });

        // Cross-channel decryption must fail — chat/signaling keys are independent.
        await expect(strategy.open(session, 'signaling', 'room-1', chatEnvelope)).rejects.toThrow();
    });

    it('produces an envelope carrying the strategy id, so a receiver can identify/reject it before decrypting', async () => {
        const strategy = createSecureStrategy();
        const session = await strategy.createSession(generateInviteSecret(), 'room-1');
        const envelope = await strategy.seal(session, 'chat', 'room-1', { text: 'hi' });

        expect(envelope.strategy).toBe(SECURE_STRATEGY_ID);
        expect(envelope.room).toBe('room-1');
        expect(typeof (envelope.data as { iv: string }).iv).toBe('string');
        expect(typeof (envelope.data as { ct: string }).ct).toBe('string');
    });

    it('rejects (throws) when opening with a session derived from a different secret — no fallback', async () => {
        const strategy = createSecureStrategy();
        const sessionA = await strategy.createSession(generateInviteSecret(), 'room-1');
        const sessionB = await strategy.createSession(generateInviteSecret(), 'room-1');

        const envelope = await strategy.seal(sessionA, 'chat', 'room-1', { text: 'secret' });
        await expect(strategy.open(sessionB, 'chat', 'room-1', envelope)).rejects.toThrow();
    });

    it('rejects tampered ciphertext without any fallback', async () => {
        const strategy = createSecureStrategy();
        const session = await strategy.createSession(generateInviteSecret(), 'room-1');
        const envelope = await strategy.seal(session, 'chat', 'room-1', { text: 'secret' });
        const data = envelope.data as { iv: string; ct: string };
        const tampered: EncryptionEnvelope = { ...envelope, data: { ...data, ct: data.ct.slice(0, -2) + (data.ct.slice(-2) === 'AA' ? 'BB' : 'AA') } };

        await expect(strategy.open(session, 'chat', 'room-1', tampered)).rejects.toThrow();
    });

    it('rejects an envelope missing iv/ct without attempting to decrypt', async () => {
        const strategy = createSecureStrategy();
        const session = await strategy.createSession(generateInviteSecret(), 'room-1');
        const malformed: EncryptionEnvelope = { v: 1, strategy: SECURE_STRATEGY_ID, room: 'room-1', data: {} };

        await expect(strategy.open(session, 'chat', 'room-1', malformed)).rejects.toThrow(/missing iv\/ct/);
    });
});
