import { fromBase64Url, toBase64Url } from '../base64url';
import type { EncryptionEnvelope, EncryptionStrategy } from '../strategy';

/**
 * The SDK's secure default strategy: AES-256-GCM AEAD, keyed from an opaque,
 * already domain-separated secret handed to `initialize()`. This is the
 * only place the generic `EncryptionStrategy` abstraction is bridged to
 * `CryptoKey` — that type is never visible outside of this module. The
 * strategy has no notion of rooms, channels, or any other application
 * concept: domain separation between logical purposes (e.g. chat vs.
 * signaling) is achieved entirely outside this module, by constructing one
 * strategy instance per purpose and `initialize()`-ing each with a distinct
 * secret.
 */
export const SECURE_STRATEGY_ID = 'aes-256-gcm';

const ENVELOPE_VERSION = 1;
/** Minimum acceptable secret length: 256 bits, matching the AES-256 key size this strategy imports. */
const SECRET_BYTE_LENGTH = 32;

interface SealedData {
    iv: string;
    ct: string;
}

/** Bind the (plaintext, public) envelope metadata into the AEAD's additional authenticated data, so tampering with it after sealing is detected. */
const buildAad = (version: number): Uint8Array => new TextEncoder().encode(`chat-e2ee:${SECURE_STRATEGY_ID}:v${version}`);

const assertInitialized = (key: CryptoKey | undefined): CryptoKey => {
    if (!key) {
        throw new Error(`Strategy "${SECURE_STRATEGY_ID}" is not initialized: call initialize(secret) first.`);
    }
    return key;
};

export const createSecureStrategy = (): EncryptionStrategy => {
    let key: CryptoKey | undefined;

    return {
        id: SECURE_STRATEGY_ID,
        description: 'AES-256-GCM AEAD. Expects an opaque, already domain-separated 256-bit secret from initialize() — this strategy performs no key derivation of its own.',
        encrypted: true,

        async initialize(secret: string): Promise<void> {
            const bytes = fromBase64Url(secret);
            if (bytes.byteLength < SECRET_BYTE_LENGTH) {
                throw new Error('Invalid secret: expected at least 256 bits of entropy.');
            }
            key = await window.crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
        },

        async encrypt(data: ArrayBuffer): Promise<EncryptionEnvelope> {
            const activeKey = assertInitialized(key);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const aad = buildAad(ENVELOPE_VERSION);

            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
                activeKey,
                data,
            );

            const sealed: SealedData = { iv: toBase64Url(iv), ct: toBase64Url(new Uint8Array(ciphertext)) };
            return { version: ENVELOPE_VERSION, strategy: SECURE_STRATEGY_ID, data: sealed };
        },

        async decrypt(envelope: EncryptionEnvelope): Promise<ArrayBuffer> {
            const activeKey = assertInitialized(key);
            if (!envelope || typeof envelope !== 'object') {
                throw new Error('Invalid envelope: expected an object.');
            }
            if (envelope.strategy !== SECURE_STRATEGY_ID) {
                throw new Error(`Unsupported encryption strategy: expected "${SECURE_STRATEGY_ID}", got "${String(envelope.strategy)}".`);
            }
            if (envelope.version !== ENVELOPE_VERSION) {
                throw new Error(`Unsupported envelope version: ${String(envelope.version)}`);
            }
            const data = envelope.data as Partial<SealedData> | undefined;
            if (!data || typeof data.iv !== 'string' || typeof data.ct !== 'string') {
                throw new Error('Invalid envelope: missing iv/ct.');
            }

            const iv = fromBase64Url(data.iv);
            const ciphertext = fromBase64Url(data.ct);
            const aad = buildAad(envelope.version);

            // Any auth-tag failure (wrong key, tampered ciphertext/AAD) throws here.
            return window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
                activeKey,
                ciphertext as BufferSource,
            );
        },

        destroy(): void {
            key = undefined;
        },
    };
};
