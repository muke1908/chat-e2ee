/**
 * Base64url (RFC 4648 §5, unpadded) helpers shared by the invite-secret and
 * secure-envelope modules. Kept separate from `atob`/`btoa` standard-base64
 * usage elsewhere so encoding rules for security-sensitive material (the
 * invite secret, envelope ciphertext) are defined in exactly one place.
 */

const toBinaryString = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
};

export const toBase64Url = (bytes: Uint8Array): string => {
    const binary = toBinaryString(bytes);
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (value: string): Uint8Array => {
    if (typeof value !== 'string' || !value) {
        throw new Error('Invalid base64url input: expected a non-empty string.');
    }
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};
