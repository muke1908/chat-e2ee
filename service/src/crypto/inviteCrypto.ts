import { fromBase64Url, toBase64Url } from './base64url';

/**
 * Invite-derived key material.
 *
 * The invitation secret is a 256-bit random value generated entirely on the
 * device that creates a room. It is carried only in the URL fragment
 * (`#room=<public-room-id>&secret=<base64url-secret>`) and is never
 * transmitted to, or stored on, the signaling server — fragments are not
 * sent as part of an HTTP request by browsers.
 *
 * Both participants derive the same pair of AES-256-GCM keys from the shared
 * secret via HKDF-SHA256, one for WebRTC signaling and one for chat
 * messages. Domain separation (distinct `info` labels, and the public room
 * id folded in as salt) ensures a compromise of one derived key cannot be
 * used to attack the other, and that keys derived for one room are useless
 * against any other room even if secrets were ever reused.
 */

const SECRET_BYTE_LENGTH = 32; // 256 bits
const SIGNALING_INFO = 'chat-e2ee:signaling:v1';
const CHAT_INFO = 'chat-e2ee:chat:v1';

export interface InviteKeys {
    signalingKey: CryptoKey;
    chatKey: CryptoKey;
}

/** Generate a new random 256-bit invitation secret, base64url encoded (unpadded). */
export const generateInviteSecret = (): string => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(SECRET_BYTE_LENGTH));
    return toBase64Url(bytes);
};

/**
 * Derive the signaling and chat AEAD keys from the invitation secret.
 *
 * `roomId` (the public room id shared with the server) is folded in as the
 * HKDF salt purely for domain separation between rooms; it is not secret.
 * The derived keys are non-extractable `CryptoKey`s — they never touch
 * application storage as raw bytes or strings.
 */
export const deriveInviteKeys = async (secret: string, roomId: string): Promise<InviteKeys> => {
    if (!roomId) {
        throw new Error('Cannot derive invite keys without a roomId.');
    }
    const secretBytes = fromBase64Url(secret);
    if (secretBytes.byteLength < SECRET_BYTE_LENGTH) {
        throw new Error('Invalid invite secret: expected 256 bits of entropy.');
    }

    const ikm = await window.crypto.subtle.importKey('raw', secretBytes as BufferSource, 'HKDF', false, ['deriveKey']);
    const salt = new TextEncoder().encode(`chat-e2ee:room:${roomId}`);

    const derive = (info: string): Promise<CryptoKey> => window.crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: new TextEncoder().encode(info) as BufferSource },
        ikm,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );

    const [signalingKey, chatKey] = await Promise.all([derive(SIGNALING_INFO), derive(CHAT_INFO)]);
    return { signalingKey, chatKey };
};
