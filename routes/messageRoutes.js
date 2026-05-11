const express = require('express');
const router = express.Router();

const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  deleteConversation
} = require('../controllers/messageController');

const { protect } = require('../middleware/authMiddleware');

// Get all conversations for current user
router.get('/conversations', protect, getConversations);

// Get or create a conversation
router.post('/conversations', protect, getOrCreateConversation);

// Get unread count
router.get('/unread-count', protect, getUnreadCount);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', protect, getMessages);

// Send a message
router.post('/conversations/:conversationId/messages', protect, sendMessage);

// Delete a conversation
router.delete('/conversations/:conversationId', protect, deleteConversation);

module.exports = router;
