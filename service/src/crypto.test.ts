import { cryptoUtils } from "./crypto";

describe('cryptoUtils', () => {
  const mockBase64String = 'ZW5jcnlwdGVkLXRleHQ='; // decoded = encrypted-text
  const subtle = {
    // Generates a new key (for symmetric algorithms) or key pair (for public-key algorithms).
    // Returns a promise that fulfills with a CryptoKey (for symmetric algorithms) or a CryptoKeyPair (for public-key algorithms).
    generateKey: jest.fn().mockResolvedValue({
      publicKey: 'public-key',
      privateKey: 'private-key',
    }),
    // Takes as input a CryptoKey object and gives you the key in an external, portable format.
    // Returns a promise - If format was jwk, then the promise fulfills with a JSON object containing the key.
    exportKey: jest.fn().mockImplementation((type, str) => str),
    // Takes as input a key in an external, portable format and gives you a CryptoKey object that you can use in the Web Crypto API.
    // Returns a promise that fulfills with the imported key as a CryptoKey object.
    importKey: jest.fn().mockImplementation((type, str) => str),
    // It takes as its arguments a key to encrypt with, some algorithm-specific parameters, and the data to encrypt (also known as "plaintext").
    // Returns a promise that fulfills with an ArrayBuffer containing the "ciphertext".
    encrypt: jest.fn().mockImplementation((algorithm, publicKey, encoded) => encoded),
    decrypt: jest.fn().mockImplementation((algorithm, privateKey, ciphertext) => ciphertext)
  };

  // Receives a Uint8Array to encode to base-64 
  // Returns ASCII string containing the Base64 representation of stringToEncode.
  const btoa = jest.fn().mockImplementation(function (str) {
    return mockBase64String;
  });
  // Receives a base-64 encoded string to decode to Uint8Array
  const atob = jest.fn().mockImplementation(function (str) {
    return "This is another message";
  });

  let window = {} as any;
  window.crypto = {
      subtle: subtle
  } as any;

  window.btoa = btoa;
  window.atob = atob;

  beforeEach(() => {
    global.window = window;
    jest.clearAllMocks();
  });

  describe('generateKeypairs', () => {
    it('should generate an object with a private and a public key', async () => {
      const keyPair = await cryptoUtils.generateKeypairs();

      expect(window.crypto.subtle.exportKey).toHaveBeenCalledWith('jwk', expect.any(String));
      expect(keyPair.privateKey).toBe(JSON.stringify('private-key'));
      expect(keyPair.publicKey).toBe(JSON.stringify('public-key'));
    });
  });

  describe('encryptMessage', () => {
    it('should encrypt plaintext using a public key and return a base64-encoded string', async () => {
      const plaintext = 'This is a message';
      const { publicKey } = await cryptoUtils.generateKeypairs();
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);

      expect(window.crypto.subtle.importKey).toHaveBeenCalledWith('jwk', expect.any(String), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
      expect(window.btoa).toHaveBeenCalledWith(expect.any(String));
      expect(ciphertext).toBe('ZW5jcnlwdGVkLXRleHQ=');
    });
  });

  describe('decryptMessage', () => {
    it('should decrypt a ciphertext using a private key', async () => {
      const plaintext = 'This is another message';
      const keyPair = await cryptoUtils.generateKeypairs();
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, keyPair.publicKey);
      const decryptedText = await cryptoUtils.decryptMessage(ciphertext, keyPair.privateKey);

      expect(window.crypto.subtle.importKey).toHaveBeenCalledWith('jwk', expect.any(String), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
      expect(window.atob).toHaveBeenCalledWith(expect.any(String));
      expect(decryptedText).toBe("This is another message");
    });
  });
});