import { generatePIN } from './pin';

describe('generatePIN', () => {
  it('should generate a PIN of length 4 given a UUID', () => {
    const uuid = 'e2ee1234-abcd-5678-efgh-9012ijkl3456';
    const pin = generatePIN(uuid);
    expect(pin.length).toBe(4);
  });

  it('should generate a PIN of specified length given a UUID and pinLength', () => {
    const uuid = 'e2ee1234-abcd-5678-efgh-9012ijkl3456';
    const pinLength = 6;
    const pin = generatePIN(uuid, pinLength);
    expect(pin.length).toBe(pinLength);
  });

  it('should generate unique PINs for different UUIDs', () => {
    const uuid1 = 'e2ee1234-abcd-5678-efgh-9012ijkl3456';
    const uuid2 = 'e2ee5678-mnop-9012-qrst-1234uvwx5678';
    const pin1 = generatePIN(uuid1);
    const pin2 = generatePIN(uuid2);
    expect(pin1).not.toBe(pin2);
  });
});
