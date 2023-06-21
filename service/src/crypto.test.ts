import e from "cors";
import { cryptoUtils } from "./crypto";

describe('cryptoUtils', () => {
  // Browser dependencies mock
  const mockEncryptionResult = new ArrayBuffer(8);
  const mock64BaseString = 'ZW5jcnlwdGVkLXRleHQ=';
  const subtle = {
    generateKey: jest.fn().mockResolvedValue({
      publicKey: 'public-key',
      privateKey: 'private-key',
    }),
    // exportKey: jest.fn().mockImplementation((type, str) => str),
    exportKey: jest.fn().mockImplementation(function (type, str) {
      console.log('exportKey: ', str);
      return str;
    }),
    // importKey: jest.fn().mockImplementation((type, str) => str),
    importKey: jest.fn().mockImplementation(function (type, str) {
      console.log('importKey: ', str);
      return str;
    }),
    encrypt: jest.fn().mockImplementation(function (algorithm, publicKey, encoded) { 
      console.log('algo: ', algorithm);
      console.log('publicKey: ', publicKey);
      console.log('encoded: ', encoded);
      return mockEncryptionResult;
    })
  };

  const btoa = jest.fn().mockImplementation(function (str) {
    console.log('str received in btoa: ', str);
    const base64string = Buffer.from(str).toString('base64');
    console.log('base64string created with Buffer: ', base64string);
    return mock64BaseString;
    // (str) => 'ZW5jcnlwdGVkLXRleHQ=');
  });

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
    it('should encrypt plaintext using a public key and return a base64-encoded string', async () => {
      const plaintext = 'This is a message';
      const { publicKey } = await cryptoUtils.generateKeypairs();
      console.log('From encryptMessage test. This is the publicKey generated: ', publicKey);
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);
      console.log('From encryptMessage test. This is the ciphertext generated: ', ciphertext);
      expect(window.crypto.subtle.importKey).toHaveBeenCalledWith('jwk', expect.any(String), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
      
      expect(ciphertext).toBe('ZW5jcnlwdGVkLXRleHQ=');
      // expect(ciphertext).toMatch(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/);

      // expect(ciphertext).toBeTruthy;

      
      // expect(ciphertext).not.toBeNull;

      
      // expect(ciphertext).toBeNull;
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