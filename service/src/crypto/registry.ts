import type { EncryptionStrategy } from './strategy';
import { createSecureStrategy, SECURE_STRATEGY_ID } from './strategies/secureStrategy';
import { createDisabledStrategy, DISABLED_STRATEGY_ID } from './strategies/disabledStrategy';

export { SECURE_STRATEGY_ID, DISABLED_STRATEGY_ID };

/** Strategy id used whenever `createChatInstance()` is not given an explicit `encryption.strategy`. */
export const DEFAULT_ENCRYPTION_STRATEGY_ID = SECURE_STRATEGY_ID;

/** Strategy id for the built-in, explicitly opted-in "no encryption" mode. */
export const NO_ENCRYPTION_STRATEGY_ID = DISABLED_STRATEGY_ID;

/**
 * Global registry/factory for `EncryptionStrategy` implementations.
 *
 * The two built-ins — the secure invite-secret HKDF + AES-GCM default and
 * the explicit "disabled" strategy — are registered up front. Any other
 * strategy (a different KDF/AEAD, a hardware-backed key store, ...) can be
 * added at runtime via `registerEncryptionStrategy()` and then selected by
 * id from `createChatInstance({ encryption: { strategy: '<id>' } })`.
 */
const registry = new Map<string, EncryptionStrategy<any>>();

const registerBuiltins = (): void => {
    registry.set(SECURE_STRATEGY_ID, createSecureStrategy());
    registry.set(DISABLED_STRATEGY_ID, createDisabledStrategy());
};
registerBuiltins();

/**
 * Register a custom encryption strategy so it can later be selected by id.
 * Throws if `strategy.id` is missing, or if a strategy is already
 * registered under that id (pass `{ override: true }` to intentionally
 * replace it — e.g. in tests).
 */
export const registerEncryptionStrategy = (strategy: EncryptionStrategy<any>, options: { override?: boolean } = {}): void => {
    if (!strategy || typeof strategy.id !== 'string' || !strategy.id) {
        throw new Error('Cannot register an encryption strategy without a non-empty string id.');
    }
    if (registry.has(strategy.id) && !options.override) {
        throw new Error(`Encryption strategy "${strategy.id}" is already registered. Pass { override: true } to replace it intentionally.`);
    }
    registry.set(strategy.id, strategy);
};

/** Remove a previously registered strategy (built-ins may be removed too, e.g. to force an "unknown strategy" scenario in tests). */
export const unregisterEncryptionStrategy = (id: string): void => {
    registry.delete(id);
};

/** True if a strategy with this id is currently registered. */
export const hasEncryptionStrategy = (id: string): boolean => registry.has(id);

/** List every currently registered strategy id. */
export const listEncryptionStrategyIds = (): string[] => Array.from(registry.keys());

/** Look up a registered strategy by id. Throws a descriptive error — never silently substitutes another strategy — if `id` is unknown. */
export const getEncryptionStrategy = (id: string): EncryptionStrategy<any> => {
    const strategy = registry.get(id);
    if (!strategy) {
        throw new Error(`Unknown encryption strategy: "${id}". Registered strategies: ${listEncryptionStrategyIds().join(', ') || '(none)'}.`);
    }
    return strategy;
};

/**
 * Resolve the strategy `createChatInstance()` should use:
 *  - `undefined` → the secure default.
 *  - a `string` → looked up in the global registry (throws if unknown).
 *  - an `EncryptionStrategy` instance → used directly, whether or not it is
 *    also registered globally (handy for one-off/ad-hoc strategies in tests
 *    without polluting the shared registry).
 */
export const resolveEncryptionStrategy = (strategy?: string | EncryptionStrategy<any>): EncryptionStrategy<any> => {
    if (!strategy) {
        return getEncryptionStrategy(DEFAULT_ENCRYPTION_STRATEGY_ID);
    }
    if (typeof strategy === 'string') {
        return getEncryptionStrategy(strategy);
    }
    if (typeof strategy.id !== 'string' || !strategy.id) {
        throw new Error('A custom encryption strategy instance must have a non-empty string id.');
    }
    return strategy;
};
