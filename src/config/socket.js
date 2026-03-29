const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokenUtils');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const IS_DEV = process.env.DEV_MODE === 'true';

    if (!token) {
      if (IS_DEV) {
        socket.user = { id: 'dev-guest', role: 'PLATFORM_ADMIN', bloodBankId: null };
        return next();
      }
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch {
      if (IS_DEV) {
        socket.user = { id: 'dev-guest', role: 'PLATFORM_ADMIN', bloodBankId: null };
        return next();
      }
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role, bloodBankId } = socket.user;

    // Join personal room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    if (role === 'PLATFORM_ADMIN') socket.join('platform:admin');
    if (role === 'BLOOD_BANK_ADMIN' && bloodBankId) socket.join(`bank:${bloodBankId}`);
    if (role === 'DONOR') socket.join(`donor:${userId}`);
    if (role === 'PATIENT') socket.join(`patient:${userId}`);

    socket.on('disconnect', () => {});
  });

  console.log('[socket] Socket.io initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
