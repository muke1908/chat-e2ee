import express from 'express';
import request from 'supertest';
import router from './index';
import channelValid from '../chatHash/utils/validateChannel';

jest.mock('../chatHash/utils/validateChannel', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../socket.io/clients', () => ({
  __esModule: true,
  default: () => ({ getClientsByChannel: (...args: unknown[]) => mockGetClients(...args) }),
}));
const mockGetClients = jest.fn();
const app = express();
app.use('/api/chat', router);

describe('participant response contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (channelValid as jest.Mock).mockResolvedValue({ valid: true });
    mockGetClients.mockReturnValue({ alice: { sid: 'socket-a' }, bob: { sid: 'socket-b' } });
  });

  it.each([0, 1, 2])('returns only a count for %i participants', async (count) => {
    mockGetClients.mockReturnValue(Object.fromEntries(
      ['alice', 'bob'].slice(0, count).map(id => [id, { sid: `socket-${id}` }])
    ));
    const response = await request(app).get('/api/chat/get-users-in-channel?channel=room&countOnly=true');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count });
    expect(mockGetClients).toHaveBeenCalledWith('room');
  });

  it.each(['', '&countOnly=false'])('keeps the legacy identity response for old callers (%s)', async (query) => {
    const response = await request(app).get(`/api/chat/get-users-in-channel?channel=room${query}`);
    expect(response.body).toEqual([{ uuid: 'alice' }, { uuid: 'bob' }]);
  });

  it('still rejects invalid rooms without looking up participants', async () => {
    (channelValid as jest.Mock).mockResolvedValue({ valid: false });
    const response = await request(app).get('/api/chat/get-users-in-channel?channel=invalid&countOnly=true');
    expect(response.status).toBe(404);
    expect(mockGetClients).not.toHaveBeenCalled();
  });
});
