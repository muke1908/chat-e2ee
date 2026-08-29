import type { EncryptionStrategy, EncryptionStrategyFactory } from './strategy';
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
 * Strategies are stateful (each holds its own key material once
 * `initialize()`d), so the registry stores *factories* — never a shared
 * instance — keyed by id. Every lookup that ultimately reaches a caller
 * (`createChatInstance()`, `getEncryptionStrategy()`, ...) creates a brand
 * new instance, so e.g. `ChatE2EE`'s independent chat/signaling strategy
 * instances never share in-memory state.
 *
 * The two built-ins — the AES-256-GCM secure default and the explicit
 * "disabled" strategy — are registered up front. Any other strategy (a
 * different AEAD, a hardware-backed key store, ...) can be added at runtime
 * via `registerEncryptionStrategy()` and then selected by id from
 * `createChatInstance({ encryption: { strategy: '<id>' } })`.
 */
const registry = new Map<string, EncryptionStrategyFactory>();

const registerBuiltins = (): void => {
    registry.set(SECURE_STRATEGY_ID, createSecureStrategy);
    registry.set(DISABLED_STRATEGY_ID, createDisabledStrategy);
};
registerBuiltins();

/**
 * Register a custom encryption strategy factory so it can later be
 * selected by id. Throws if `id` is missing, or if a strategy is already
 * registered under that id (pass `{ override: true }` to intentionally
 * replace it — e.g. in tests).
 */
export const registerEncryptionStrategy = (
    id: string,
    factory: EncryptionStrategyFactory,
    options: { override?: boolean } = {},
): void => {
    if (typeof id !== 'string' || !id) {
        throw new Error('Cannot register an encryption strategy without a non-empty string id.');
    }
    if (typeof factory !== 'function') {
        throw new Error('Cannot register an encryption strategy without a factory function.');
    }
    if (registry.has(id) && !options.override) {
        throw new Error(`Encryption strategy "${id}" is already registered. Pass { override: true } to replace it intentionally.`);
    }
    registry.set(id, factory);
};

/** Remove a previously registered strategy (built-ins may be removed too, e.g. to force an "unknown strategy" scenario in tests). */
export const unregisterEncryptionStrategy = (id: string): void => {
    registry.delete(id);
};

/** True if a strategy with this id is currently registered. */
export const hasEncryptionStrategy = (id: string): boolean => registry.has(id);

/** List every currently registered strategy id. */
export const listEncryptionStrategyIds = (): string[] => Array.from(registry.keys());

/** Look up a registered strategy's factory by id. Throws a descriptive error — never silently substitutes another strategy — if `id` is unknown. */
export const getEncryptionStrategyFactory = (id: string): EncryptionStrategyFactory => {
    const factory = registry.get(id);
    if (!factory) {
        throw new Error(`Unknown encryption strategy: "${id}". Registered strategies: ${listEncryptionStrategyIds().join(', ') || '(none)'}.`);
    }
    return factory;
};

/** Look up a registered strategy by id and create a brand new instance of it. Throws for an unknown id. */
export const getEncryptionStrategy = (id: string): EncryptionStrategy => getEncryptionStrategyFactory(id)();

/**
 * Resolve the strategy factory `createChatInstance()` should use to create
 * its (independent) chat/signaling strategy instances:
 *
 *  - `undefined` → the secure default's factory.
 *  - a `string` → looked up in the global registry (throws if unknown).
 *  - a factory function → used directly, whether or not it is also
 *    registered globally (handy for one-off/ad-hoc strategies in tests
 *    without polluting the shared registry).
 */
export const resolveEncryptionStrategyFactory = (strategy?: string | EncryptionStrategyFactory): EncryptionStrategyFactory => {
    if (!strategy) {
        return getEncryptionStrategyFactory(DEFAULT_ENCRYPTION_STRATEGY_ID);
    }
    if (typeof strategy === 'string') {
        return getEncryptionStrategyFactory(strategy);
    }
    if (typeof strategy !== 'function') {
        throw new Error('A custom encryption strategy must be a factory function that returns an EncryptionStrategy instance.');
    }
    return strategy;
};
