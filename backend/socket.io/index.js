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
  io.on('connection', (socket) => connectionListener(socket, io));

  return io;
};

const socketEmit = (topic, sid, data) => {
  const socket = io.sockets.sockets[sid];
  socket.emit(topic, data);
};

module.exports = {
  initSocket,
  socketEmit
};
