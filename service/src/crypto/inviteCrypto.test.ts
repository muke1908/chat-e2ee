import { webcrypto } from 'crypto';

// Polyfill for Node versions < 19 that do not expose globalThis.crypto
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// The invite-crypto module accesses `window.crypto`, `window.btoa`, and
// `window.atob`. In a Node (non-jsdom) environment `window` is undefined, so
// point it at globalThis, which already has btoa/atob (Node 16+) and crypto
// (Node 19+).
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}

import { deriveInviteKeys, generateInviteSecret } from './inviteCrypto';
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

describe('deriveInviteKeys()', () => {
    it('derives usable non-extractable AES-256-GCM keys for signaling and chat', async () => {
        const secret = generateInviteSecret();
        const { signalingKey, chatKey } = await deriveInviteKeys(secret, 'room-1');

        expect(signalingKey.algorithm.name).toBe('AES-GCM');
        expect(chatKey.algorithm.name).toBe('AES-GCM');
        expect(signalingKey.extractable).toBe(false);
        expect(chatKey.extractable).toBe(false);
    });

    it('derives the same keys given the same secret and roomId (deterministic)', async () => {
        const secret = generateInviteSecret();
        const a = await deriveInviteKeys(secret, 'room-1');
        const b = await deriveInviteKeys(secret, 'room-1');

        // CryptoKey objects aren't directly comparable; prove equivalence by
        // encrypting with one and decrypting with the other.
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const plaintext = new TextEncoder().encode('hello');
        const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, a.chatKey, plaintext);
        const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, b.chatKey, ciphertext);
        expect(new TextDecoder().decode(decrypted)).toBe('hello');
    });

    it('produces different keys for different room ids (domain separation)', async () => {
        const secret = generateInviteSecret();
        const roomA = await deriveInviteKeys(secret, 'room-a');
        const roomB = await deriveInviteKeys(secret, 'room-b');

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, roomA.chatKey, new TextEncoder().encode('hi'));

        await expect(
            window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, roomB.chatKey, ciphertext)
        ).rejects.toThrow();
    });

    it('produces different keys for signaling vs. chat (domain separation)', async () => {
        const secret = generateInviteSecret();
        const { signalingKey, chatKey } = await deriveInviteKeys(secret, 'room-1');

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, signalingKey, new TextEncoder().encode('hi'));

        await expect(
            window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, chatKey, ciphertext)
        ).rejects.toThrow();
    });

    it('produces different keys for different secrets given the same room', async () => {
        const roomId = 'room-1';
        const a = await deriveInviteKeys(generateInviteSecret(), roomId);
        const b = await deriveInviteKeys(generateInviteSecret(), roomId);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, a.chatKey, new TextEncoder().encode('hi'));

        await expect(
            window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, b.chatKey, ciphertext)
        ).rejects.toThrow();
    });

    it('rejects when roomId is missing', async () => {
        await expect(deriveInviteKeys(generateInviteSecret(), '')).rejects.toThrow('roomId');
    });

    it('rejects a secret with insufficient entropy', async () => {
        const shortSecret = toBase64Url(new Uint8Array(8));
        await expect(deriveInviteKeys(shortSecret, 'room-1')).rejects.toThrow(/256 bits/);
    });
});
