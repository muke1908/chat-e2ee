import { fromBase64Url, toBase64Url } from './base64url';

/**
 * Versioned, opaque AEAD envelope used for every signaling and chat message
 * exchanged over the socket connection.
 *
 * The server only ever sees this shape and relays it verbatim — it has no
 * way to inspect, modify, or replay it into a different room/version
 * without the receiver rejecting it outright:
 *
 *  - `v` is pinned to the current protocol version. Any other value is
 *    rejected before decryption is even attempted (no silent downgrade).
 *  - `room` is bound into the AEAD additional-authenticated-data (AAD) with
 *    `v`, so an envelope sealed for one room/version can never be decrypted
 *    successfully in another — tampering with either flips the auth tag.
 *  - There is no plaintext fallback: any failure (bad version, wrong room,
 *    truncated data, failed authentication tag) throws and the caller must
 *    drop the message outright.
 */

export const ENVELOPE_VERSION = 1;

export interface SecureEnvelope {
    v: number;
    room: string;
    iv: string;
    ct: string;
}

const buildAad = (version: number, room: string): Uint8Array =>
    new TextEncoder().encode(`chat-e2ee:envelope:v${version}:${room}`);

/** Seal an arbitrary JSON-serialisable payload into a versioned, room-bound AEAD envelope. */
export const sealEnvelope = async (key: CryptoKey, room: string, payload: unknown): Promise<SecureEnvelope> => {
    if (!room) {
        throw new Error('Cannot seal an envelope without a room id.');
    }
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const aad = buildAad(ENVELOPE_VERSION, room);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
        key,
        plaintext as BufferSource,
    );

    return {
        v: ENVELOPE_VERSION,
        room,
        iv: toBase64Url(iv),
        ct: toBase64Url(new Uint8Array(ciphertext)),
    };
};

/**
 * Open a secure envelope. Strictly rejects — throws — on any mismatch:
 * unknown/unsupported version, wrong room, malformed shape, or a failed
 * authentication tag. There is never a plaintext fallback; callers must
 * treat a thrown error as "drop this message".
 */
export const openEnvelope = async <T = unknown>(key: CryptoKey, room: string, envelope: SecureEnvelope): Promise<T> => {
    if (!envelope || typeof envelope !== 'object') {
        throw new Error('Invalid envelope: expected an object.');
    }
    if (envelope.v !== ENVELOPE_VERSION) {
        throw new Error(`Unsupported envelope version: ${String(envelope.v)}`);
    }
    if (!room || envelope.room !== room) {
        throw new Error('Envelope room does not match the active channel.');
    }
    if (typeof envelope.iv !== 'string' || typeof envelope.ct !== 'string') {
        throw new Error('Invalid envelope: missing iv/ct.');
    }

    const aad = buildAad(envelope.v, envelope.room);
    const iv = fromBase64Url(envelope.iv);
    const ciphertext = fromBase64Url(envelope.ct);

    // Any auth-tag failure (wrong key, tampered ciphertext/AAD) throws here.
    const plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
        key,
        ciphertext as BufferSource,
    );

    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
};
