import { webcrypto } from 'crypto';

// Polyfill for Node versions < 19 that do not expose globalThis.crypto
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// inviteCrypto accesses `window.crypto`, `window.btoa`, and `window.atob`. In
// a Node (non-jsdom) environment `window` is undefined, so point it at
// globalThis, which already has btoa/atob (Node 16+) and crypto (Node 19+).
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { deriveChannelSecrets, generateInviteSecret } from './inviteCrypto';
import { fromBase64Url, toBase64Url } from './base64url';

describe('generateInviteSecret()', () => {
    it('returns a base64url string decoding to 256 bits (32 bytes)', () => {
        const secret = generateInviteSecret();
        expect(typeof secret).toBe('string');
        expect(secret).not.toMatch(/[+/=]/); // strictly base64url, not standard base64
        expect(fromBase64Url(secret).byteLength).toBe(32);
    });

    it('generates a different secret on every call', () => {
        const a = generateInviteSecret();
        const b = generateInviteSecret();
        expect(a).not.toBe(b);
    });
});

describe('base64url helpers', () => {
    it('round-trips arbitrary byte sequences, including bytes that need padding', () => {
        for (const length of [1, 2, 3, 4, 16, 31, 32, 33]) {
            const bytes = window.crypto.getRandomValues(new Uint8Array(length));
            expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
        }
    });

    it('produces unpadded, URL-safe output', () => {
        const bytes = new Uint8Array([251, 255, 191, 191, 251]);
        const encoded = toBase64Url(bytes);
        expect(encoded).not.toMatch(/[+/=]/);
    });
});

describe('deriveChannelSecrets()', () => {
    it('derives opaque, base64url-encoded 256-bit secrets for signaling and chat', async () => {
        const secret = generateInviteSecret();
        const { signalingSecret, chatSecret } = await deriveChannelSecrets(secret);

        expect(typeof signalingSecret).toBe('string');
        expect(typeof chatSecret).toBe('string');
        expect(fromBase64Url(signalingSecret).byteLength).toBe(32);
        expect(fromBase64Url(chatSecret).byteLength).toBe(32);
    });

    it('derives the same secrets given the same invitation secret (deterministic)', async () => {
        const secret = generateInviteSecret();
        const a = await deriveChannelSecrets(secret);
        const b = await deriveChannelSecrets(secret);

        expect(a).toEqual(b);
    });

    it('produces different secrets for signaling vs. chat (domain separation)', async () => {
        const secret = generateInviteSecret();
        const { signalingSecret, chatSecret } = await deriveChannelSecrets(secret);

        expect(signalingSecret).not.toBe(chatSecret);
    });

    it('produces different secrets for different invitation secrets', async () => {
        const a = await deriveChannelSecrets(generateInviteSecret());
        const b = await deriveChannelSecrets(generateInviteSecret());

        expect(a.chatSecret).not.toBe(b.chatSecret);
    });

    it('rejects a secret with insufficient entropy', async () => {
        const shortSecret = toBase64Url(new Uint8Array(8));
        await expect(deriveChannelSecrets(shortSecret)).rejects.toThrow(/256 bits/);
    });
});
