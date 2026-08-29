import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import {
    DEFAULT_ENCRYPTION_STRATEGY_ID,
    NO_ENCRYPTION_STRATEGY_ID,
    SECURE_STRATEGY_ID,
    DISABLED_STRATEGY_ID,
    getEncryptionStrategy,
    hasEncryptionStrategy,
    listEncryptionStrategyIds,
    registerEncryptionStrategy,
    resolveEncryptionStrategy,
    unregisterEncryptionStrategy,
} from './registry';
import type { EncryptionStrategy } from './strategy';

const buildStrategy = (id: string, overrides: Partial<EncryptionStrategy> = {}): EncryptionStrategy => ({
    id,
    encrypts: true,
    async createSession() {
        return {};
    },
    async seal(_session, _channel, room, payload) {
        return { v: 1, strategy: id, room, data: payload };
    },
    async open(_session, _channel, _room, envelope) {
        return envelope.data as any;
    },
    ...overrides,
});

describe('encryption strategy registry', () => {
    afterEach(() => {
        unregisterEncryptionStrategy('custom-test-strategy');
        unregisterEncryptionStrategy('custom-test-strategy-2');
    });

    describe('built-ins', () => {
        it('registers the secure strategy as the default', () => {
            expect(DEFAULT_ENCRYPTION_STRATEGY_ID).toBe(SECURE_STRATEGY_ID);
            expect(hasEncryptionStrategy(SECURE_STRATEGY_ID)).toBe(true);
        });

        it('registers the disabled strategy under NO_ENCRYPTION_STRATEGY_ID', () => {
            expect(NO_ENCRYPTION_STRATEGY_ID).toBe(DISABLED_STRATEGY_ID);
            expect(hasEncryptionStrategy(DISABLED_STRATEGY_ID)).toBe(true);
        });

        it('the secure strategy reports encrypts: true', () => {
            expect(getEncryptionStrategy(SECURE_STRATEGY_ID).encrypts).toBe(true);
        });

        it('the disabled strategy reports encrypts: false', () => {
            expect(getEncryptionStrategy(DISABLED_STRATEGY_ID).encrypts).toBe(false);
        });

        it('listEncryptionStrategyIds() includes both built-ins', () => {
            expect(listEncryptionStrategyIds()).toEqual(expect.arrayContaining([SECURE_STRATEGY_ID, DISABLED_STRATEGY_ID]));
        });
    });

    describe('registerEncryptionStrategy()', () => {
        it('registers a custom strategy so it can be looked up by id', () => {
            registerEncryptionStrategy(buildStrategy('custom-test-strategy'));
            expect(hasEncryptionStrategy('custom-test-strategy')).toBe(true);
            expect(getEncryptionStrategy('custom-test-strategy').id).toBe('custom-test-strategy');
        });

        it('throws when registering a strategy without a non-empty string id', () => {
            expect(() => registerEncryptionStrategy(buildStrategy(''))).toThrow(/non-empty string id/);
            expect(() => registerEncryptionStrategy(undefined as unknown as EncryptionStrategy)).toThrow(/non-empty string id/);
        });

        it('throws when re-registering an already-registered id without { override: true }', () => {
            registerEncryptionStrategy(buildStrategy('custom-test-strategy'));
            expect(() => registerEncryptionStrategy(buildStrategy('custom-test-strategy'))).toThrow(/already registered/);
        });

        it('throws when attempting to silently replace a built-in strategy', () => {
            expect(() => registerEncryptionStrategy(buildStrategy(SECURE_STRATEGY_ID))).toThrow(/already registered/);
        });

        it('allows replacing a strategy intentionally via { override: true }', () => {
            registerEncryptionStrategy(buildStrategy('custom-test-strategy'), { override: false });
            const replacement = buildStrategy('custom-test-strategy', { encrypts: false });
            expect(() => registerEncryptionStrategy(replacement, { override: true })).not.toThrow();
            expect(getEncryptionStrategy('custom-test-strategy').encrypts).toBe(false);
        });

        it('unregisterEncryptionStrategy() removes a strategy so it becomes unknown again', () => {
            registerEncryptionStrategy(buildStrategy('custom-test-strategy-2'));
            expect(hasEncryptionStrategy('custom-test-strategy-2')).toBe(true);
            unregisterEncryptionStrategy('custom-test-strategy-2');
            expect(hasEncryptionStrategy('custom-test-strategy-2')).toBe(false);
        });
    });

    describe('getEncryptionStrategy() — unknown strategy', () => {
        it('throws a descriptive error for an id that was never registered', () => {
            expect(() => getEncryptionStrategy('totally-unknown-strategy-id')).toThrow(/Unknown encryption strategy[\s\S]*totally-unknown-strategy-id/);
        });

        it('lists the currently registered strategies in the error message', () => {
            expect(() => getEncryptionStrategy('nope')).toThrow(new RegExp(SECURE_STRATEGY_ID));
        });
    });

    describe('resolveEncryptionStrategy()', () => {
        it('resolves to the secure default when called with no argument', () => {
            expect(resolveEncryptionStrategy().id).toBe(DEFAULT_ENCRYPTION_STRATEGY_ID);
        });

        it('resolves a registered id to its strategy instance', () => {
            registerEncryptionStrategy(buildStrategy('custom-test-strategy'));
            expect(resolveEncryptionStrategy('custom-test-strategy').id).toBe('custom-test-strategy');
        });

        it('throws for an unregistered string id', () => {
            expect(() => resolveEncryptionStrategy('does-not-exist')).toThrow(/Unknown encryption strategy/);
        });

        it('accepts an ad-hoc strategy instance without requiring it to be registered', () => {
            const adHoc = buildStrategy('ad-hoc-unregistered-strategy');
            expect(resolveEncryptionStrategy(adHoc)).toBe(adHoc);
            expect(hasEncryptionStrategy('ad-hoc-unregistered-strategy')).toBe(false);
        });

        it('throws when given a strategy-like instance without a valid id', () => {
            expect(() => resolveEncryptionStrategy({ id: '' } as unknown as EncryptionStrategy)).toThrow(/non-empty string id/);
        });
    });
});
