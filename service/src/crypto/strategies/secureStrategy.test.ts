import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { generateInviteSecret, deriveChannelSecrets } from '../inviteCrypto';
import { createSecureStrategy, SECURE_STRATEGY_ID } from './secureStrategy';
import type { EncryptionEnvelope } from '../strategy';

const toBytes = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer;
const toText = (bytes: ArrayBuffer): string => new TextDecoder().decode(bytes);

describe('secure strategy (AES-256-GCM)', () => {
    it('reports its id and encrypted: true', () => {
        const strategy = createSecureStrategy();
        expect(strategy.id).toBe(SECURE_STRATEGY_ID);
        expect(strategy.encrypted).toBe(true);
    });

    it('round-trips arbitrary bytes after initialize()', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);

        const envelope = await strategy.encrypt(toBytes('hi'));
        const recovered = await strategy.decrypt(envelope);

        expect(toText(recovered)).toBe('hi');
    });

    it('produces an envelope carrying only version/strategy/data — no room or channel information', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        const envelope = await strategy.encrypt(toBytes('hi'));

        expect(Object.keys(envelope).sort()).toEqual(['data', 'strategy', 'version']);
        expect(envelope.strategy).toBe(SECURE_STRATEGY_ID);
        expect(envelope.version).toBe(1);
        expect(typeof (envelope.data as { iv: string }).iv).toBe('string');
        expect(typeof (envelope.data as { ct: string }).ct).toBe('string');
    });

    it('two instances initialized with the same secret can decrypt each other\'s envelopes', async () => {
        const secret = generateInviteSecret();
        const { chatSecret } = await deriveChannelSecrets(secret);

        const sender = createSecureStrategy();
        const receiver = createSecureStrategy();
        await sender.initialize(chatSecret);
        await receiver.initialize(chatSecret);

        const envelope = await sender.encrypt(toBytes('shared secret material'));
        expect(toText(await receiver.decrypt(envelope))).toBe('shared secret material');
    });

    it('rejects (throws) when decrypting with an instance initialized from a different secret — no fallback', async () => {
        const { chatSecret: secretA } = await deriveChannelSecrets(generateInviteSecret());
        const { chatSecret: secretB } = await deriveChannelSecrets(generateInviteSecret());

        const sender = createSecureStrategy();
        await sender.initialize(secretA);
        const receiver = createSecureStrategy();
        await receiver.initialize(secretB);

        const envelope = await sender.encrypt(toBytes('secret'));
        await expect(receiver.decrypt(envelope)).rejects.toThrow();
    });

    it('domain-separated chat/signaling secrets from deriveChannelSecrets() are independent — cross-decryption fails', async () => {
        const secret = generateInviteSecret();
        const { chatSecret, signalingSecret } = await deriveChannelSecrets(secret);

        const chatStrategy = createSecureStrategy();
        await chatStrategy.initialize(chatSecret);
        const signalingStrategy = createSecureStrategy();
        await signalingStrategy.initialize(signalingSecret);

        const envelope = await chatStrategy.encrypt(toBytes('chat only'));
        await expect(signalingStrategy.decrypt(envelope)).rejects.toThrow();
    });

    it('rejects tampered ciphertext without any fallback', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        const envelope = await strategy.encrypt(toBytes('secret'));
        const data = envelope.data as { iv: string; ct: string };
        const tampered: EncryptionEnvelope = { ...envelope, data: { ...data, ct: data.ct.slice(0, -2) + (data.ct.slice(-2) === 'AA' ? 'BB' : 'AA') } };

        await expect(strategy.decrypt(tampered)).rejects.toThrow();
    });

    it('rejects an envelope missing iv/ct without attempting to decrypt', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        const malformed: EncryptionEnvelope = { version: 1, strategy: SECURE_STRATEGY_ID, data: {} };

        await expect(strategy.decrypt(malformed)).rejects.toThrow(/missing iv\/ct/);
    });

    it('rejects an envelope produced by a different strategy id', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        const foreign: EncryptionEnvelope = { version: 1, strategy: 'some-other-strategy', data: {} };

        await expect(strategy.decrypt(foreign)).rejects.toThrow(/Unsupported encryption strategy/);
    });

    it('rejects an envelope with an unsupported protocol version', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        const envelope = await strategy.encrypt(toBytes('hi'));
        const tampered: EncryptionEnvelope = { ...envelope, version: 2 };

        await expect(strategy.decrypt(tampered)).rejects.toThrow(/version/i);
    });

    it('rejects a secret shorter than 256 bits', async () => {
        const strategy = createSecureStrategy();
        const shortSecret = Buffer.from(new Uint8Array(8)).toString('base64url');
        await expect(strategy.initialize(shortSecret)).rejects.toThrow(/256 bits/);
    });

    it('throws when encrypt()/decrypt() are called before initialize()', async () => {
        const strategy = createSecureStrategy();
        await expect(strategy.encrypt(toBytes('hi'))).rejects.toThrow(/not initialized/);
        await expect(strategy.decrypt({ version: 1, strategy: SECURE_STRATEGY_ID, data: {} })).rejects.toThrow(/not initialized/);
    });

    it('destroy() clears key material so subsequent encrypt()/decrypt() throws', async () => {
        const strategy = createSecureStrategy();
        const { chatSecret } = await deriveChannelSecrets(generateInviteSecret());
        await strategy.initialize(chatSecret);
        strategy.destroy();

        await expect(strategy.encrypt(toBytes('hi'))).rejects.toThrow(/not initialized/);
    });
});
