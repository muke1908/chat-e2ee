import { deriveInviteKeys, type InviteKeys } from '../inviteCrypto';
import { openEnvelope, sealEnvelope, type SecureEnvelope } from '../secureEnvelope';
import type { EncryptionChannel, EncryptionEnvelope, EncryptionStrategy } from '../strategy';

/**
 * The SDK's secure default strategy: invite-secret HKDF-SHA256 key
 * derivation (`deriveInviteKeys`) feeding AES-256-GCM AEAD envelopes
 * (`sealEnvelope`/`openEnvelope`). This is the only place the generic
 * `EncryptionStrategy` abstraction is bridged to `CryptoKey`/`InviteKeys` —
 * neither type is ever visible to `sdk.ts` or any other consumer.
 */
export const SECURE_STRATEGY_ID = 'invite-secret-hkdf-aes-gcm';

const SESSION_KEY_FOR_CHANNEL: Record<EncryptionChannel, keyof InviteKeys> = {
    chat: 'chatKey',
    signaling: 'signalingKey',
};

const keyFor = (session: InviteKeys, channel: EncryptionChannel): CryptoKey => session[SESSION_KEY_FOR_CHANNEL[channel]];

export const createSecureStrategy = (): EncryptionStrategy<InviteKeys> => ({
    id: SECURE_STRATEGY_ID,
    description:
        'Default secure strategy: invite-secret HKDF-SHA256 key derivation with independent AES-256-GCM AEAD keys per channel (chat/signaling).',
    encrypts: true,

    async createSession(secret, roomId) {
        return deriveInviteKeys(secret, roomId);
    },

    async seal(session, channel, room, payload) {
        const inner: SecureEnvelope = await sealEnvelope(keyFor(session, channel), room, payload);
        const envelope: EncryptionEnvelope = {
            v: inner.v,
            strategy: SECURE_STRATEGY_ID,
            room: inner.room,
            data: { iv: inner.iv, ct: inner.ct },
        };
        return envelope;
    },

    async open<T>(session: InviteKeys, channel: EncryptionChannel, room: string, envelope: EncryptionEnvelope): Promise<T> {
        const data = envelope.data as { iv?: unknown; ct?: unknown } | undefined;
        if (!data || typeof data.iv !== 'string' || typeof data.ct !== 'string') {
            throw new Error('Invalid envelope: missing iv/ct.');
        }
        const inner: SecureEnvelope = { v: envelope.v, room: envelope.room, iv: data.iv, ct: data.ct };
        return openEnvelope<T>(keyFor(session, channel), room, inner);
    },
});
