const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      
      // Join personal room for notifications
      socket.join(`user:${user._id}`);
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.user?.name})`);

    // Join conversation room
    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} joined conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation:${conversationId}`);
    });

    // Join workspace room for task updates
    socket.on('join_workspace', ({ workspaceId }) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`User ${socket.userId} joined workspace:${workspaceId}`);
    });

    // Leave workspace room
    socket.on('leave_workspace', ({ workspaceId }) => {
      socket.leave(`workspace:${workspaceId}`);
      console.log(`User ${socket.userId} left workspace:${workspaceId}`);
    });

    // Join project room
    socket.on('join_project', ({ projectId }) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.userId} joined project:${projectId}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

/**
 * Emit a message to a conversation room
 */
const emitMessage = (conversationId, message) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('new_message', {
    message,
    conversationId
  });
};

/**
 * Emit unread count update to a user
 */
const emitUnreadCount = (userId, count, conversationId) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('unread_count', { conversationId, count });
};

/**
 * Emit a notification to a user
 */
const emitNotification = (userId, notification) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
};

/**
 * Emit task update to workspace room
 */
const emitTaskUpdate = (workspaceId, projectId, task) => {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit('task:updated', {
    task,
    projectId,
    workspaceId
  });
};

/**
 * Emit new proposal to job poster
 */
const emitNewProposal = (posterId, proposal, jobId) => {
  if (!io) return;
  io.to(`user:${posterId}`).emit('proposal:received', {
    proposal,
    jobId
  });
};

/**
 * Emit proposal status update to freelancer
 */
const emitProposalStatus = (freelancerId, proposal, jobId) => {
  if (!io) return;
  io.to(`user:${freelancerId}`).emit('proposal:status_changed', {
    proposal,
    jobId
  });
};

/**
 * Emit hire invitation to invited user
 */
const emitHireInvitation = (userId, invitation) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('hire:invitation', invitation);
};

/**
 * Emit redemption notification to approvers
 */
const emitRedemptionNotification = (approverIds, redemption) => {
  if (!io) return;
  approverIds.forEach(id => {
    io.to(`user:${id}`).emit('redemption:new', redemption);
  });
};

module.exports = {
  initSocket,
  getIO,
  emitMessage,
  emitUnreadCount,
  emitNotification,
  emitTaskUpdate,
  emitNewProposal,
  emitProposalStatus,
  emitHireInvitation,
  emitRedemptionNotification
};
