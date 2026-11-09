const jwt = require('jsonwebtoken');

let io = null;

// Socket.io: everyone joins "public"; logged-in users also join "user:<id>" for private notices.
function initRealtime(server, origin) {
  const { Server } = require('socket.io');
  io = new Server(server, { cors: { origin, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      try {
        const p = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = p.id;
        socket.role = p.role;
      } catch {
        /* anonymous */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.userId) socket.join(`user:${socket.userId}`);
    if (socket.role === 'admin') socket.join('role:admin');
    socket.on('article:watch', (id) => typeof id === 'string' && socket.join(`article:${id}`));
    socket.on('article:unwatch', (id) => typeof id === 'string' && socket.leave(`article:${id}`));
  });
  return io;
}

const emit = (event, payload, room) => {
  if (!io) return;
  (room ? io.to(room) : io).emit(event, payload);
};

module.exports = { initRealtime, emit };
