const { Server } = require('socket.io');
const { verifyAccessToken, getUserIdFromPayload } = require('../utils/jwt');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow connection from any origin (will be restricted in production if needed)
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Auth Middleware for Socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      // Handle Bearer schema
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const payload = verifyAccessToken(cleanToken);
      
      socket.user = {
        userId: getUserIdFromPayload(payload),
        role: payload.role,
        status: payload.status
      };
      next();
    } catch (err) {
      console.error('[SOCKET AUTH ERROR]', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    console.log(`[SOCKET] Connected: ${userId} (${socket.user.role})`);

    // Join personal room based on userId (useful for general notifications, inbox status updates)
    socket.join(userId);

    // Join specific conversation room
    socket.on('join_room', (conversationId) => {
      socket.join(conversationId);
      console.log(`[SOCKET] User ${userId} joined room: ${conversationId}`);
    });

    // Leave specific conversation room
    socket.on('leave_room', (conversationId) => {
      socket.leave(conversationId);
      console.log(`[SOCKET] User ${userId} left room: ${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Disconnected: ${userId}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO
};
