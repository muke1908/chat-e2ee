import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { deriveInviteKeys, generateInviteSecret } from './inviteCrypto';
import { ENVELOPE_VERSION, openEnvelope, sealEnvelope, type SecureEnvelope } from './secureEnvelope';

describe('sealEnvelope() / openEnvelope()', () => {
    it('round-trips an arbitrary JSON payload', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const payload = { seq: 1, timestamp: Date.now(), text: 'hello world', image: '' };

        const envelope = await sealEnvelope(chatKey, 'room-1', payload);
        expect(envelope.v).toBe(ENVELOPE_VERSION);
        expect(envelope.room).toBe('room-1');
        expect(typeof envelope.iv).toBe('string');
        expect(typeof envelope.ct).toBe('string');

        const recovered = await openEnvelope(chatKey, 'room-1', envelope);
        expect(recovered).toEqual(payload);
    });

    it('produces a different ciphertext (and iv) for every call, even for the same payload', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const payload = { seq: 1, text: 'same' };

        const a = await sealEnvelope(chatKey, 'room-1', payload);
        const b = await sealEnvelope(chatKey, 'room-1', payload);

        expect(a.iv).not.toBe(b.iv);
        expect(a.ct).not.toBe(b.ct);
    });

    it('rejects (throws) when decrypting with the wrong key', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const { chatKey: wrongKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');

        const envelope = await sealEnvelope(chatKey, 'room-1', { text: 'secret' });

        await expect(openEnvelope(wrongKey, 'room-1', envelope)).rejects.toThrow();
    });

    it('rejects when the room does not match, even with the correct key (no fallback)', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const envelope = await sealEnvelope(chatKey, 'room-1', { text: 'secret' });

        await expect(openEnvelope(chatKey, 'room-2', envelope)).rejects.toThrow(/room/i);
    });

    it('rejects an envelope with an unsupported version, even with the correct key/room (no fallback)', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const envelope = await sealEnvelope(chatKey, 'room-1', { text: 'secret' });
        const tampered: SecureEnvelope = { ...envelope, v: 2 };

        await expect(openEnvelope(chatKey, 'room-1', tampered)).rejects.toThrow(/version/i);
    });

    it('rejects tampered ciphertext (authentication failure)', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        const envelope = await sealEnvelope(chatKey, 'room-1', { text: 'secret' });
        const tampered: SecureEnvelope = { ...envelope, ct: envelope.ct.slice(0, -2) + (envelope.ct.slice(-2) === 'AA' ? 'BB' : 'AA') };

        await expect(openEnvelope(chatKey, 'room-1', tampered)).rejects.toThrow();
    });

    it('rejects a malformed envelope (missing iv/ct) without a fallback', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');

        await expect(openEnvelope(chatKey, 'room-1', { v: ENVELOPE_VERSION, room: 'room-1' } as unknown as SecureEnvelope)).rejects.toThrow(/iv\/ct/);
    });

    it('rejects a non-object envelope without a fallback', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');

        await expect(openEnvelope(chatKey, 'room-1', null as unknown as SecureEnvelope)).rejects.toThrow(/expected an object/);
    });

    it('throws when sealing without a room id', async () => {
        const { chatKey } = await deriveInviteKeys(generateInviteSecret(), 'room-1');
        await expect(sealEnvelope(chatKey, '', { text: 'x' })).rejects.toThrow(/room id/);
    });
});
