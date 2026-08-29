import { fromBase64Url, toBase64Url } from '../base64url';
import type { EncryptionEnvelope, EncryptionStrategy } from '../strategy';

/**
 * Explicit "no encryption" strategy.
 *
 * Selecting this strategy is an intentional, opt-in decision (e.g. local
 * development, a trusted transport already providing confidentiality) — it
 * is never a fallback that kicks in automatically when cryptography fails.
 * Payloads are still wrapped in the same versioned envelope shape as every
 * other strategy so the wire format stays uniform, but `data` carries the
 * plaintext bytes (base64url-encoded, to keep the envelope JSON-safe)
 * directly instead of ciphertext.
 *
 * Just like the secure strategy, there is no silent fallback on receipt: an
 * unknown/mismatched strategy id or an unsupported envelope version throws
 * outright and the caller must drop the message. It carries no notion of
 * rooms, channels, or any other application concept.
 */
export const DISABLED_STRATEGY_ID = 'disabled';

const DISABLED_ENVELOPE_VERSION = 1;

const assertInitialized = (initialized: boolean): void => {
    if (!initialized) {
        throw new Error(`Strategy "${DISABLED_STRATEGY_ID}" is not initialized: call initialize(secret) first.`);
    }
};

export const createDisabledStrategy = (): EncryptionStrategy => {
    let initialized = false;

    return {
        id: DISABLED_STRATEGY_ID,
        description:
            'Explicitly disabled encryption: payloads are relayed as versioned plaintext envelopes. Intended for local development/testing — never select this for production traffic.',
        encrypted: false,

        async initialize(): Promise<void> {
            // No key material to establish; the secret is intentionally ignored.
            initialized = true;
        },

        async encrypt(data: ArrayBuffer): Promise<EncryptionEnvelope> {
            assertInitialized(initialized);
            return {
                version: DISABLED_ENVELOPE_VERSION,
                strategy: DISABLED_STRATEGY_ID,
                data: toBase64Url(new Uint8Array(data)),
            };
        },

        async decrypt(envelope: EncryptionEnvelope): Promise<ArrayBuffer> {
            assertInitialized(initialized);
            if (!envelope || typeof envelope !== 'object') {
                throw new Error('Invalid envelope: expected an object.');
            }
            if (envelope.strategy !== DISABLED_STRATEGY_ID) {
                throw new Error(`Unsupported encryption strategy: expected "${DISABLED_STRATEGY_ID}", got "${String(envelope.strategy)}".`);
            }
            if (envelope.version !== DISABLED_ENVELOPE_VERSION) {
                throw new Error(`Unsupported envelope version: ${String(envelope.version)}`);
            }
            if (typeof envelope.data !== 'string') {
                throw new Error('Invalid envelope: missing data.');
            }
            const bytes = fromBase64Url(envelope.data);
            return bytes.buffer as ArrayBuffer;
        },

        destroy(): void {
            initialized = false;
        },
    };
};
