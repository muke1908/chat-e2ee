// disabledStrategy accesses `window.btoa`/`window.atob` (via base64url) to
// keep its envelope `data` JSON-safe. In a Node (non-jsdom) environment
// `window` is undefined, so point it at globalThis, which already has
// btoa/atob (Node 16+).
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { createDisabledStrategy, DISABLED_STRATEGY_ID } from './disabledStrategy';
import type { EncryptionEnvelope } from '../strategy';

const toBytes = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer;
const toText = (bytes: ArrayBuffer): string => new TextDecoder().decode(bytes);

describe('disabled strategy (explicit no-encryption)', () => {
    it('reports its id and encrypted: false', () => {
        const strategy = createDisabledStrategy();
        expect(strategy.id).toBe(DISABLED_STRATEGY_ID);
        expect(strategy.encrypted).toBe(false);
    });

    it('produces a versioned envelope carrying only version/strategy/data, whose `data` decodes back to the plaintext bytes', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        const envelope = await strategy.encrypt(toBytes('hello world'));

        expect(Object.keys(envelope).sort()).toEqual(['data', 'strategy', 'version']);
        expect(envelope.version).toBe(1);
        expect(envelope.strategy).toBe(DISABLED_STRATEGY_ID);
        expect(typeof envelope.data).toBe('string'); // base64url-encoded plaintext, never ciphertext
    });

    it('round-trips arbitrary bytes', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');

        const envelope = await strategy.encrypt(toBytes('hello there'));
        const recovered = await strategy.decrypt(envelope);

        expect(toText(recovered)).toBe('hello there');
    });

    it('does not require a real secret — initialize() succeeds even with an empty string', async () => {
        const strategy = createDisabledStrategy();
        await expect(strategy.initialize('')).resolves.toBeUndefined();
    });

    it('rejects an unsupported envelope version — no silent fallback to "assume compatible"', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        const envelope = await strategy.encrypt(toBytes('hi'));
        const tampered: EncryptionEnvelope = { ...envelope, version: 2 };

        await expect(strategy.decrypt(tampered)).rejects.toThrow(/version/i);
    });

    it('rejects an envelope produced by a different strategy id, even though there is no ciphertext to fail authentication', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        const foreign: EncryptionEnvelope = { version: 1, strategy: 'some-other-strategy', data: 'aGk' };

        await expect(strategy.decrypt(foreign)).rejects.toThrow(/Unsupported encryption strategy/);
    });

    it('rejects a non-object envelope without a fallback', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        await expect(strategy.decrypt(null as unknown as EncryptionEnvelope)).rejects.toThrow(/expected an object/);
    });

    it('rejects an envelope with non-string data', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        const malformed: EncryptionEnvelope = { version: 1, strategy: DISABLED_STRATEGY_ID, data: { not: 'a string' } };
        await expect(strategy.decrypt(malformed)).rejects.toThrow(/missing data/);
    });

    it('throws when encrypt()/decrypt() are called before initialize()', async () => {
        const strategy = createDisabledStrategy();
        await expect(strategy.encrypt(toBytes('hi'))).rejects.toThrow(/not initialized/);
        await expect(strategy.decrypt({ version: 1, strategy: DISABLED_STRATEGY_ID, data: 'aGk' })).rejects.toThrow(/not initialized/);
    });

    it('destroy() resets initialization state so subsequent encrypt()/decrypt() throws', async () => {
        const strategy = createDisabledStrategy();
        await strategy.initialize('unused-secret');
        strategy.destroy();

        await expect(strategy.encrypt(toBytes('hi'))).rejects.toThrow(/not initialized/);
    });
});
