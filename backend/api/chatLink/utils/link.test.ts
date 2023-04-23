import generateLink from './link';
import { generatePIN } from './pin';
import { v4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('hash'),
}));

jest.mock('./pin', () => ({
  generatePIN: jest.fn().mockReturnValue('1234'),
}));

test('chat link generation', () => {
  const generatedLink = generateLink();
  expect(generatedLink).toMatchObject({
    hash: 'hash',
    link: expect.any(String),
    absoluteLink: undefined,
    expired: false,
    deleted: false,
    pin: '1234',
    pinCreatedAt: expect.any(Number),
  });

  expect(generatePIN).toBeCalledTimes(1);
  expect(v4).toBeCalledTimes(1);
});
