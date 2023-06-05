import { isJSDocEnumTag } from "typescript";
import { ICryptoUtils } from "./public/types";
import { cryptoUtils } from "./crypto";

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
(global as any).window = {
  crypto: mockCrypto,
};

global.window.btoa = jest.fn();
global.window.atob = jest.fn();

describe('cryptoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKeypairs', () => {
    it('should generate an object with non-empty private and public keys', async () => {

    });

    it('should generate valid key formats', async () => {

    }); 
  });

  describe('encryptMessage', () => {
    it('should encrypt plaintext using a public key', async () => {

    });

    it('should return a ')
  });

  describe('decryptMessage', () => {
    it('should decrypt a ciphertext using a private key', async () => {

    });
  });
});