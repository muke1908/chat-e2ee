import { AesGcmEncryption, type ISymmetricEncryption } from './cryptoAES';
import { ECDHEncryption } from './cryptoecdh';
import { cryptoUtils, type IAsymmetricEncryption } from './cryptoRSA';
import type { EncryptionStrategy } from './public/types';

/** Names of built-in symmetric encryption strategies. */
export type BuiltinSymmetricStrategy = 'AES-GCM' | 'ECDH-X25519';

/** Names of built-in asymmetric encryption strategies. */
export type BuiltinAsymmetricStrategy = 'RSA-OAEP';

/** Config accepted by EncryptionFactory.create(). */
export interface EncryptionStrategyConfig {
    /** Name of the symmetric strategy to use. Defaults to 'AES-GCM'. */
    symmetric?: BuiltinSymmetricStrategy | (string & {});
    /** Name of the asymmetric strategy to use. Defaults to 'RSA-OAEP'. */
    asymmetric?: BuiltinAsymmetricStrategy | (string & {});
}

/**
 * Registry-based factory for encryption strategies.
 *
 * Built-in strategies:
 *   symmetric  – 'AES-GCM'  (AES-256-GCM via Web Crypto)
 *   asymmetric – 'RSA-OAEP' (RSA-OAEP / SHA-256 via Web Crypto)
 *
 * Register custom strategies with registerSymmetric / registerAsymmetric,
 * then pass the strategy name to create().
 */
class EncryptionStrategyFactory {
    private readonly symmetricRegistry = new Map<string, () => ISymmetricEncryption>([
        ['AES-GCM', () => new AesGcmEncryption()],
        ['ECDH-X25519', () => new ECDHEncryption()],
    ]);

    private readonly asymmetricRegistry = new Map<string, () => IAsymmetricEncryption>([
        ['RSA-OAEP', () => cryptoUtils],
    ]);

    /**
     * Register a custom symmetric strategy under a name.
     * Returns `this` for chaining.
     */
    registerSymmetric(name: string, factory: () => ISymmetricEncryption): this {
        this.symmetricRegistry.set(name, factory);
        return this;
    }

    /**
     * Register a custom asymmetric strategy under a name.
     * Returns `this` for chaining.
     */
    registerAsymmetric(name: string, factory: () => IAsymmetricEncryption): this {
        this.asymmetricRegistry.set(name, factory);
        return this;
    }

    /**
     * Create an EncryptionStrategy from registered strategy names.
     * Omit a field to fall back to the built-in default.
     *
     * @throws if a requested strategy name has not been registered.
     */
    create(config?: EncryptionStrategyConfig): EncryptionStrategy {
        const symName = config?.symmetric ?? 'AES-GCM';
        const asmName = config?.asymmetric ?? 'RSA-OAEP';

        const symFactory = this.symmetricRegistry.get(symName);
        if (!symFactory) {
            throw new Error(
                `Unknown symmetric strategy: "${symName}". ` +
                `Register it first with EncryptionFactory.registerSymmetric().`
            );
        }

        const asmFactory = this.asymmetricRegistry.get(asmName);
        if (!asmFactory) {
            throw new Error(
                `Unknown asymmetric strategy: "${asmName}". ` +
                `Register it first with EncryptionFactory.registerAsymmetric().`
            );
        }

        return {
            symmetric: symFactory(),
            asymmetric: asmFactory(),
        };
    }
}

/**
 * Singleton factory — pre-registered with 'AES-GCM' and 'RSA-OAEP'.
 * Extend it by calling registerSymmetric / registerAsymmetric.
 */
export const EncryptionFactory = new EncryptionStrategyFactory();
