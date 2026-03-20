const jwt = require('jsonwebtoken');

let io;
// Map user IDs to their socket IDs to emit private events
const userSocketMap = new Map();

const initSocket = (server) => {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: {
      origin: '*', // Adjust to match your frontend origin in production
      methods: ['GET', 'POST']
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication Error: Token missing'));
    }

    try {
      // Remove 'Bearer ' if present
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'secret_key');
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Authentication Error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} for user: ${socket.userId}`);
    
    // Store user session
    userSocketMap.set(socket.userId, socket.id);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} for user: ${socket.userId}`);
      userSocketMap.delete(socket.userId);
    });
  });

  return io;
};

const sendNotificationToUser = (userId, notificationData) => {
  if (!io) {
    console.warn('Socket.io is not initialized yet');
    return;
  }
  
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('new_notification', notificationData);
  }
};

module.exports = {
  initSocket,
  sendNotificationToUser
};
