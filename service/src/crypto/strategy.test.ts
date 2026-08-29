import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import type { EncryptionEnvelope, EncryptionStrategy } from './strategy';

/**
 * Fake strategy used to exercise the generic `EncryptionStrategy` contract
 * in isolation, without pulling in any real cryptography. Every call is
 * recorded via jest mocks.
 */
function buildFakeStrategy(overrides: Partial<EncryptionStrategy> = {}): {
    strategy: EncryptionStrategy;
    initialize: jest.Mock;
    encrypt: jest.Mock;
    decrypt: jest.Mock;
    destroy: jest.Mock;
} {
    let initializedSecret: string | undefined;
    const initialize = jest.fn(async (secret: string) => {
        initializedSecret = secret;
    });
    const encrypt = jest.fn(async (data: ArrayBuffer): Promise<EncryptionEnvelope> => ({
        version: 1,
        strategy: 'fake-strategy',
        data: { secret: initializedSecret, bytes: Array.from(new Uint8Array(data)) },
    }));
    const decrypt = jest.fn(async (envelope: EncryptionEnvelope): Promise<ArrayBuffer> => {
        const bytes = (envelope.data as { bytes: number[] }).bytes;
        return new Uint8Array(bytes).buffer;
    });
    const destroy = jest.fn(() => {
        initializedSecret = undefined;
    });

    const strategy: EncryptionStrategy = {
        id: 'fake-strategy',
        encrypted: true,
        initialize,
        encrypt,
        decrypt,
        destroy,
        ...overrides,
    };
    return { strategy, initialize, encrypt, decrypt, destroy };
}

const toBytes = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer;
const toText = (bytes: ArrayBuffer): string => new TextDecoder().decode(bytes);

describe('EncryptionStrategy contract', () => {
    it('exposes id and encrypted as plain, synchronous properties', () => {
        const { strategy } = buildFakeStrategy({ id: 'my-strategy', encrypted: false });
        expect(strategy.id).toBe('my-strategy');
        expect(strategy.encrypted).toBe(false);
    });

    it('initialize() is called with an opaque secret string', async () => {
        const { strategy, initialize } = buildFakeStrategy();
        await strategy.initialize('opaque-secret-value');
        expect(initialize).toHaveBeenCalledWith('opaque-secret-value');
    });

    it('encrypt() takes an ArrayBuffer and returns an EncryptionEnvelope with only version/strategy/data', async () => {
        const { strategy } = buildFakeStrategy();
        await strategy.initialize('secret');

        const envelope = await strategy.encrypt(toBytes('hello world'));

        expect(Object.keys(envelope).sort()).toEqual(['data', 'strategy', 'version']);
        expect(envelope.strategy).toBe('fake-strategy');
        expect(typeof envelope.version).toBe('number');
    });

    it('decrypt() round-trips the bytes originally passed to encrypt()', async () => {
        const { strategy } = buildFakeStrategy();
        await strategy.initialize('secret');

        const envelope = await strategy.encrypt(toBytes('round-trip me'));
        const recovered = await strategy.decrypt(envelope);

        expect(toText(recovered)).toBe('round-trip me');
    });

    it('destroy() tears the instance down synchronously without throwing', async () => {
        const { strategy, destroy } = buildFakeStrategy();
        await strategy.initialize('secret');
        expect(() => strategy.destroy()).not.toThrow();
        expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('propagates errors thrown by decrypt() (e.g. a failed auth tag) without any fallback', async () => {
        const failingDecrypt = jest.fn().mockRejectedValue(new Error('boom: auth tag mismatch'));
        const { strategy } = buildFakeStrategy({ decrypt: failingDecrypt });
        await strategy.initialize('secret');

        const envelope: EncryptionEnvelope = { version: 1, strategy: 'fake-strategy', data: {} };
        await expect(strategy.decrypt(envelope)).rejects.toThrow('boom: auth tag mismatch');
    });
});
