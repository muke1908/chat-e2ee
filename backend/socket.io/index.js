const socketIO = require('socket.io');
const { connectionListener } = require('./listeners');

let io = null;

const initSocket = (server) => {
  if (io) {
    return io;
  }
  io = socketIO.listen(server);

  // eslint-disable-next-line no-console
  console.log('Websocket is up!');

  // add listeners
  io.on('connection', connectionListener);
  return io;
};

const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket not initiated');
  }

  return io;
};

module.exports = { getSocketInstance, initSocket };
