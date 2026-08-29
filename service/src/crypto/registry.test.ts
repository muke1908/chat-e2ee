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
    getEncryptionStrategyFactory,
    hasEncryptionStrategy,
    listEncryptionStrategyIds,
    registerEncryptionStrategy,
    resolveEncryptionStrategyFactory,
    unregisterEncryptionStrategy,
} from './registry';
import type { EncryptionStrategy, EncryptionStrategyFactory } from './strategy';

const buildStrategyFactory = (id: string, overrides: Partial<EncryptionStrategy> = {}): EncryptionStrategyFactory => () => ({
    id,
    encrypted: true,
    async initialize() {
        return undefined;
    },
    async encrypt(data) {
        return { version: 1, strategy: id, data: Array.from(new Uint8Array(data)) };
    },
    async decrypt(envelope) {
        return new Uint8Array(envelope.data as number[]).buffer;
    },
    destroy() {
        return undefined;
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

        it('the secure strategy reports encrypted: true', () => {
            expect(getEncryptionStrategy(SECURE_STRATEGY_ID).encrypted).toBe(true);
        });

        it('the disabled strategy reports encrypted: false', () => {
            expect(getEncryptionStrategy(DISABLED_STRATEGY_ID).encrypted).toBe(false);
        });

        it('listEncryptionStrategyIds() includes both built-ins', () => {
            expect(listEncryptionStrategyIds()).toEqual(expect.arrayContaining([SECURE_STRATEGY_ID, DISABLED_STRATEGY_ID]));
        });
    });

    describe('registerEncryptionStrategy()', () => {
        it('registers a custom strategy factory so it can be looked up by id', () => {
            registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'));
            expect(hasEncryptionStrategy('custom-test-strategy')).toBe(true);
            expect(getEncryptionStrategy('custom-test-strategy').id).toBe('custom-test-strategy');
        });

        it('throws when registering without a non-empty string id', () => {
            expect(() => registerEncryptionStrategy('', buildStrategyFactory(''))).toThrow(/non-empty string id/);
        });

        it('throws when registering without a factory function', () => {
            expect(() => registerEncryptionStrategy('custom-test-strategy', undefined as unknown as EncryptionStrategyFactory)).toThrow(/factory function/);
        });

        it('throws when re-registering an already-registered id without { override: true }', () => {
            registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'));
            expect(() => registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'))).toThrow(/already registered/);
        });

        it('throws when attempting to silently replace a built-in strategy', () => {
            expect(() => registerEncryptionStrategy(SECURE_STRATEGY_ID, buildStrategyFactory(SECURE_STRATEGY_ID))).toThrow(/already registered/);
        });

        it('allows replacing a strategy intentionally via { override: true }', () => {
            registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'), { override: false });
            const replacement = buildStrategyFactory('custom-test-strategy', { encrypted: false });
            expect(() => registerEncryptionStrategy('custom-test-strategy', replacement, { override: true })).not.toThrow();
            expect(getEncryptionStrategy('custom-test-strategy').encrypted).toBe(false);
        });

        it('unregisterEncryptionStrategy() removes a strategy so it becomes unknown again', () => {
            registerEncryptionStrategy('custom-test-strategy-2', buildStrategyFactory('custom-test-strategy-2'));
            expect(hasEncryptionStrategy('custom-test-strategy-2')).toBe(true);
            unregisterEncryptionStrategy('custom-test-strategy-2');
            expect(hasEncryptionStrategy('custom-test-strategy-2')).toBe(false);
        });
    });

    describe('getEncryptionStrategy() / getEncryptionStrategyFactory()', () => {
        it('returns a brand new instance on every call (strategies are stateful, never shared)', () => {
            registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'));
            const a = getEncryptionStrategy('custom-test-strategy');
            const b = getEncryptionStrategy('custom-test-strategy');
            expect(a).not.toBe(b);
        });

        it('throws a descriptive error for an id that was never registered', () => {
            expect(() => getEncryptionStrategy('totally-unknown-strategy-id')).toThrow(/Unknown encryption strategy[\s\S]*totally-unknown-strategy-id/);
            expect(() => getEncryptionStrategyFactory('totally-unknown-strategy-id')).toThrow(/Unknown encryption strategy/);
        });

        it('lists the currently registered strategies in the error message', () => {
            expect(() => getEncryptionStrategy('nope')).toThrow(new RegExp(SECURE_STRATEGY_ID));
        });
    });

    describe('resolveEncryptionStrategyFactory()', () => {
        it('resolves to the secure default factory when called with no argument', () => {
            expect(resolveEncryptionStrategyFactory()().id).toBe(DEFAULT_ENCRYPTION_STRATEGY_ID);
        });

        it('resolves a registered id to its factory', () => {
            registerEncryptionStrategy('custom-test-strategy', buildStrategyFactory('custom-test-strategy'));
            expect(resolveEncryptionStrategyFactory('custom-test-strategy')().id).toBe('custom-test-strategy');
        });

        it('throws for an unregistered string id', () => {
            expect(() => resolveEncryptionStrategyFactory('does-not-exist')).toThrow(/Unknown encryption strategy/);
        });

        it('accepts an ad-hoc factory function without requiring it to be registered', () => {
            const adHoc = buildStrategyFactory('ad-hoc-unregistered-strategy');
            expect(resolveEncryptionStrategyFactory(adHoc)).toBe(adHoc);
            expect(hasEncryptionStrategy('ad-hoc-unregistered-strategy')).toBe(false);
        });

        it('calling the resolved factory twice produces two distinct instances', () => {
            const factory = resolveEncryptionStrategyFactory(buildStrategyFactory('distinct-check'));
            expect(factory()).not.toBe(factory());
        });

        it('throws when given something that is not a string or a factory function', () => {
            expect(() => resolveEncryptionStrategyFactory({ id: 'nope' } as unknown as EncryptionStrategyFactory)).toThrow(/factory function/);
        });
    });
});
