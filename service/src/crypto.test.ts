import { isJSDocEnumTag } from "typescript";
import { ICryptoUtils } from "./public/types";
import { cryptoUtils } from "./crypto";

describe('cryptoUtils', () => {
  // Browser dependencies mock
  const mockCrypto = {
    subtle: {
        generateKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        importKey: jest.fn(),
        exportKey: jest.fn()
    }
  };

  beforeAll(() => {
    Object.defineProperty(global.window, 'crypto', {
      value: mockCrypto,
      writable: true
    });
  });

  afterAll(() => {
    delete global.window;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKeypairs', () => {
    it('should generate an object with a private and a public key', async () => {
      const keyPair = await cryptoUtils.generateKeypairs();

      expect(typeof keyPair.privateKey).toBe('string');
      expect(typeof keyPair.publicKey).toBe('string');
    });
  });

  describe('encryptMessage', () => {
    it('should encrypt plaintext using a public key and return a string', async () => {
      const plaintext = 'This is a message';

      const { publicKey } = await cryptoUtils.generateKeypairs();
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, publicKey);

      expect(typeof ciphertext).toBe('string');
    });

    it('should produce different ciphertexts for different plaintexts', async () => {
      const plaintext1 = 'First message';
      const plaintext2 = 'Second message';

      const { publicKey } = await cryptoUtils.generateKeypairs();
      const ciphertext1 = await cryptoUtils.encryptMessage(plaintext1, publicKey);
      const ciphertext2 = await cryptoUtils.encryptMessage(plaintext2, publicKey);

      expect(ciphertext1).not.toBe(ciphertext2);
    });
  });

  describe('decryptMessage', () => {
    it('should decrypt a ciphertext using a private key', async () => {
      const plaintext = 'This is another message';

      const keyPair = await cryptoUtils.generateKeypairs();
      const ciphertext = await cryptoUtils.encryptMessage(plaintext, keyPair.publicKey);
      const decryptedText = await cryptoUtils.decryptMessage(ciphertext, keyPair.privateKey);

      expect(decryptedText).toBe(plaintext);
    });
  });
});