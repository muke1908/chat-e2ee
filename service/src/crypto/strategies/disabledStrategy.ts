import type { EncryptionChannel, EncryptionEnvelope, EncryptionStrategy } from '../strategy';

/**
 * Explicit "no encryption" strategy.
 *
 * Selecting this strategy is an intentional, opt-in decision (e.g. local
 * development, a trusted transport already providing confidentiality) — it
 * is never a fallback that kicks in automatically when cryptography fails.
 * Payloads are still wrapped in the same versioned, room-bound envelope
 * shape as every other strategy so the wire format stays uniform, but
 * `data` carries the plaintext payload directly instead of ciphertext.
 *
 * Just like the secure strategy, there is no silent fallback on receipt:
 * an unknown/mismatched strategy id, an unsupported envelope version, or a
 * room mismatch all throw outright and the caller must drop the message.
 */
export const DISABLED_STRATEGY_ID = 'disabled';

const DISABLED_ENVELOPE_VERSION = 1;

export const createDisabledStrategy = (): EncryptionStrategy<null> => ({
    id: DISABLED_STRATEGY_ID,
    description:
        'Explicitly disabled encryption: payloads are relayed as versioned plaintext envelopes. Intended for local development/testing — never select this for production traffic.',
    encrypts: false,

    async createSession(): Promise<null> {
        // No key material to establish; the session is an intentional no-op.
        return null;
    },

    async seal(_session, _channel, room, payload): Promise<EncryptionEnvelope> {
        if (!room) {
            throw new Error('Cannot seal an envelope without a room id.');
        }
        return {
            v: DISABLED_ENVELOPE_VERSION,
            strategy: DISABLED_STRATEGY_ID,
            room,
            data: payload,
        };
    },

    async open<T>(_session: null, _channel: EncryptionChannel, room: string, envelope: EncryptionEnvelope): Promise<T> {
        if (!envelope || typeof envelope !== 'object') {
            throw new Error('Invalid envelope: expected an object.');
        }
        if (envelope.strategy !== DISABLED_STRATEGY_ID) {
            throw new Error(`Unsupported encryption strategy: expected "${DISABLED_STRATEGY_ID}", got "${String(envelope.strategy)}".`);
        }
        if (envelope.v !== DISABLED_ENVELOPE_VERSION) {
            throw new Error(`Unsupported envelope version: ${String(envelope.v)}`);
        }
        if (!room || envelope.room !== room) {
            throw new Error('Envelope room does not match the active channel.');
        }
        return envelope.data as T;
    },
});
