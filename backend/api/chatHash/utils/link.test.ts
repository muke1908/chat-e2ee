import { v4 } from 'uuid';

import generateLink from './link';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('hash'),
}));

test('chat link generation', () => {
  const generatedLink = generateLink();
  expect(generatedLink).toMatchObject({
    hash: 'hash',
    expired: false,
    deleted: false,
  });
  expect(generatedLink).not.toHaveProperty('pin');
  expect(generatedLink).not.toHaveProperty('pinCreatedAt');

  expect(v4).toBeCalledTimes(1);
});
