import e from "cors";
import { cryptoUtils } from "./crypto";

describe('cryptoUtils', () => {
  // Browser dependencies mock
  const subtle = {
    generateKey: jest.fn().mockResolvedValue({
      publicKey: 'public-key',
      privateKey: 'private-key',
    }),
    exportKey: jest.fn().mockImplementation((type, str) => str),
    importKey: jest.fn().mockImplementation((type, str) => str),
    encrypt: jest.fn().mockResolvedValue({
      ciphertext: 'encrypted-text'
    })
  };

  const btoa = jest.fn().mockImplementation((str) => str);

  let window = {} as any;
  window.crypto = {
      subtle: subtle
  } as any;
  window.btoa = btoa;

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
    it('should encrypt plaintext using a public key and return a string', async () => {
      const plaintext = 'This is a message';

      const { publicKey } = await cryptoUtils.generateKeypairs();
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);

      expect(window.crypto.subtle.importKey).toHaveBeenCalledWith('jwk', expect.any(String), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
      expect(ciphertext).toBe('encrypted-text');
    });

    // it('should produce different ciphertexts for different plaintexts', async () => {
    //   const plaintext1 = 'First message';
    //   const plaintext2 = 'Second message';

    //   const { publicKey } = await cryptoUtils.generateKeypairs();
    //   const ciphertext1 = await cryptoUtils.encryptMessage(plaintext1, publicKey);
    //   const ciphertext2 = await cryptoUtils.encryptMessage(plaintext2, publicKey);

    //   expect(ciphertext1).not.toBe(ciphertext2);
    // });
  });

  // describe('decryptMessage', () => {
  //   it('should decrypt a ciphertext using a private key', async () => {
  //     const plaintext = 'This is another message';

  //     const keyPair = await cryptoUtils.generateKeypairs();
  //     const ciphertext = await cryptoUtils.encryptMessage(plaintext, keyPair.publicKey);
  //     const decryptedText = await cryptoUtils.decryptMessage(ciphertext, keyPair.privateKey);

  //     expect(decryptedText).toBe(plaintext);
  //   });
  // });
});