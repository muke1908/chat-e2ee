import makeRequest from './client';
import { getParticipantCount, getUsersInChannel } from './messages';

jest.mock('./client', () => ({ __esModule: true, default: jest.fn() }));
const request = makeRequest as jest.Mock;

describe('participant metadata', () => {
  beforeEach(() => request.mockReset());

  it.each([0, 1, 2])('requests only a count (%i)', async (count) => {
    request.mockResolvedValue({ count });
    await expect(getParticipantCount({ channelID: 'room&other=value' })).resolves.toBe(count);
    expect(request).toHaveBeenCalledWith(
      'chat/get-users-in-channel?channel=room%26other%3Dvalue&countOnly=true',
      { method: 'GET' }
    );
  });

  it('accepts legacy server responses without a second request', async () => {
    request.mockResolvedValue([{ uuid: 'alice' }, { uuid: 'bob' }]);
    await expect(getParticipantCount({ channelID: 'room' })).resolves.toBe(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('preserves the explicit identity-list API', async () => {
    const users = [{ uuid: 'alice' }];
    request.mockResolvedValue(users);
    await expect(getUsersInChannel({ channelID: 'room' })).resolves.toEqual(users);
    expect(request).toHaveBeenCalledWith('chat/get-users-in-channel?channel=room', { method: 'GET' });
  });

  it('propagates errors without retrying with an identity request', async () => {
    request.mockRejectedValue(new Error('Not found'));
    await expect(getParticipantCount({ channelID: 'room' })).rejects.toThrow('Not found');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
