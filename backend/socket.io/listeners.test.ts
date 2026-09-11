import connectionListener from './listeners';
import { CustomSocket, socketEmit } from './index';
import channelValid from '../api/chatHash/utils/validateChannel';

jest.mock('./index', () => ({
  ...jest.requireActual('./index'),
  socketEmit: jest.fn(),
}));
jest.mock('../api/chatHash/utils/validateChannel', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('./clients', () => ({
  __esModule: true,
  default: () => ({
    getReceiverIDBySenderID: () => 'peer',
    getSIDByIDs: () => ({ sid: 'peer-socket' }),
  }),
}));

describe('relay metadata contracts', () => {
  let handlers: Record<string, (...args: any[]) => any>;
  let socket: CustomSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    socket = {
      id: 'sender-socket',
      userID: 'sender',
      channelID: 'room',
      on: jest.fn((event, handler) => { handlers[event] = handler; }),
      emit: jest.fn(),
    } as unknown as CustomSocket;
    connectionListener(socket, {});
  });

  it.each([
    ['chat-message', 'chat-message'],
    ['webrtc-signal', 'webrtc-session-description'],
  ])('keeps %s relay and acknowledgment payloads minimal', (event, topic) => {
    const envelope = { version: 1, strategy: 'custom', data: { opaque: 'ciphertext' } };
    const ack = jest.fn();
    handlers[event]({ envelope, userName: 'private-name', sender: 'spoofed', channelID: 'other-room', type: 'offer' }, ack);
    if (event === 'chat-message') {
      expect(socketEmit).toHaveBeenCalledWith(topic, 'peer-socket', {
        id: expect.any(Number), timestamp: expect.any(Number), sender: 'sender', envelope,
      });
      const delivered = (socketEmit as jest.Mock).mock.calls[0][2];
      expect(ack).toHaveBeenCalledWith({ id: delivered.id, timestamp: delivered.timestamp });
    } else {
      expect(socketEmit).toHaveBeenCalledWith(topic, 'peer-socket', { envelope });
      expect(ack).toHaveBeenCalledWith({ status: 'ok' });
    }
    expect((socketEmit as jest.Mock).mock.calls[0][2].envelope).toBe(envelope);
  });

  it('relays only the receipt id', () => {
    handlers.received({ id: 42, sender: 'unnecessary', timestamp: 123 });
    expect(socketEmit).toHaveBeenCalledWith('delivered', 'peer-socket', 42);
  });

  it('does not log an invalid room identifier', async () => {
    (channelValid as jest.Mock).mockResolvedValue({ valid: false });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await handlers['chat-join']({ userID: 'private-user', channelID: 'private-room' });
      expect(log).toHaveBeenCalledWith('Invalid channelID');
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });
});
