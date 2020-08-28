const connectionListener = (socket) => {
  socket.emit('message', 'ping!');
};

module.exports = {
  connectionListener
};
