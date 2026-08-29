import { fromBase64Url, toBase64Url } from './base64url';

/**
 * Invitation secret and per-channel secret derivation.
 *
 * The invitation secret is a 256-bit random value generated entirely on the
 * device that creates a room. It is carried only in the URL fragment
 * (`#room=<public-room-id>&secret=<base64url-secret>`) and is never
 * transmitted to, or stored on, the signaling server — fragments are not
 * sent as part of an HTTP request by browsers.
 *
 * Both participants derive the same pair of opaque, 256-bit secrets from
 * the shared invitation secret via HKDF-SHA256, one for WebRTC signaling
 * and one for chat messages. This domain separation happens entirely
 * *outside* the `EncryptionStrategy` layer: distinct `info` labels ensure a
 * compromise of one derived secret cannot be used to attack the other.
 * Derivation depends *only* on the invitation secret — the room id is never
 * folded in, and remains purely routing state (which the server knows and
 * uses to place participants together) with no cryptographic role. Each
 * derived secret is handed, opaquely, to its own independent strategy
 * instance's `initialize()` — the strategy itself never sees the room id or
 * which channel it was derived for.
 */

const SECRET_BYTE_LENGTH = 32; // 256 bits
/** Fixed HKDF salt for this protocol version — domain separation between logical channels is achieved via distinct `info` labels, not per-invocation salt. */
const PROTOCOL_SALT = new TextEncoder().encode('chat-e2ee:v1');
const SIGNALING_INFO = 'chat-e2ee:signaling:v1';
const CHAT_INFO = 'chat-e2ee:chat:v1';

/** Opaque, domain-separated secrets ready to be handed to independent strategy instances via `initialize()`. */
export interface ChannelSecrets {
    signalingSecret: string;
    chatSecret: string;
}

/** Generate a new random 256-bit invitation secret, base64url encoded (unpadded). */
export const generateInviteSecret = (): string => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(SECRET_BYTE_LENGTH));
    return toBase64Url(bytes);
};

/**
 * Derive the signaling and chat secrets from the invitation secret.
 *
 * Depends only on `secret` — there is no room id (or any other value)
 * folded in. The derived secrets are opaque, base64url-encoded byte
 * strings — they carry no indication of the room or channel they were
 * derived for, and are only ever meaningful to whichever
 * `EncryptionStrategy` instance is `initialize()`d with them.
 */
export const deriveChannelSecrets = async (secret: string): Promise<ChannelSecrets> => {
    const secretBytes = fromBase64Url(secret);
    if (secretBytes.byteLength < SECRET_BYTE_LENGTH) {
        throw new Error('Invalid invite secret: expected 256 bits of entropy.');
    }

    const ikm = await window.crypto.subtle.importKey('raw', secretBytes as BufferSource, 'HKDF', false, ['deriveBits']);

    const derive = async (info: string): Promise<string> => {
        const bits = await window.crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: PROTOCOL_SALT as BufferSource, info: new TextEncoder().encode(info) as BufferSource },
            ikm,
            SECRET_BYTE_LENGTH * 8,
        );
        return toBase64Url(new Uint8Array(bits));
    };

    const [signalingSecret, chatSecret] = await Promise.all([derive(SIGNALING_INFO), derive(CHAT_INFO)]);
    return { signalingSecret, chatSecret };
};
