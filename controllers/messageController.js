const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');

/**
 * @desc    Get all conversations for the logged-in user
 * @route   GET /api/v1/messages/conversations
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar')
      .populate('lastMessage.sender', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    // Add unread count for current user to each conversation
    const enrichedConversations = conversations.map(conv => {
      const unreadEntry = conv.unreadCounts?.find(
        u => String(u.user) === String(req.user._id)
      );
      return {
        ...conv,
        unreadCount: unreadEntry?.count || 0,
        otherParticipant: conv.participants.find(
          p => String(p._id) !== String(req.user._id)
        )
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedConversations.length,
      data: enrichedConversations
    });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get or create a conversation with another user
 * @route   POST /api/v1/messages/conversations
 * @access  Private
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { userId, workspaceId, projectId } = req.body;

    if (!userId) {
      return res.status(400).json({ msg: 'Please provide userId.' });
    }

    // Prevent self-messaging
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ msg: 'You cannot message yourself.' });
    }

    // Verify other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId], $size: 2 }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
        workspace: workspaceId || undefined,
        project: projectId || undefined,
        unreadCounts: [
          { user: req.user._id, count: 0 },
          { user: userId, count: 0 }
        ]
      });
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar')
      .populate('lastMessage.sender', 'name');

    res.status(200).json({
      success: true,
      data: populatedConversation
    });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/v1/messages/conversations/:conversationId/messages
 * @access  Private (participant only)
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found.' });
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      p => String(p) === String(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ msg: 'You are not a participant in this conversation.' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [messages, totalCount] = await Promise.all([
      Message.find({ conversation: conversationId })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Message.countDocuments({ conversation: conversationId })
    ]);

    // Mark messages as read for current user
    await Message.updateMany(
      {
        conversation: conversationId,
        'readBy.user': { $ne: req.user._id },
        sender: { $ne: req.user._id }
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    );

    // Reset unread count for current user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        'unreadCounts.$[elem].count': 0
      }
    }, {
      arrayFilters: [{ 'elem.user': req.user._id }]
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Send a message in a conversation
 * @route   POST /api/v1/messages/conversations/:conversationId/messages
 * @access  Private (participant only)
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ msg: 'Message content is required.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found.' });
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      p => String(p) === String(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ msg: 'You are not a participant in this conversation.' });
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content.trim(),
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    // Update conversation last message and unread counts
    const otherParticipant = conversation.participants.find(
      p => String(p) !== String(req.user._id)
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content: content.trim(),
        sender: req.user._id,
        createdAt: new Date()
      },
      $inc: {
        'unreadCounts.$[elem].count': 1
      }
    }, {
      arrayFilters: [{ 'elem.user': otherParticipant }]
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get total unread message count for current user
 * @route   GET /api/v1/messages/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id });

    let totalUnread = 0;
    conversations.forEach(conv => {
      const unreadEntry = conv.unreadCounts?.find(
        u => String(u.user) === String(req.user._id)
      );
      totalUnread += unreadEntry?.count || 0;
    });

    res.status(200).json({
      success: true,
      count: totalUnread
    });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete a conversation
 * @route   DELETE /api/v1/messages/conversations/:conversationId
 * @access  Private (participant only)
 */
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ msg: 'Conversation not found.' });
    }

    const isParticipant = conversation.participants.some(
      p => String(p) === String(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ msg: 'You are not a participant in this conversation.' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({
      success: true,
      msg: 'Conversation deleted successfully.'
    });
  } catch (error) {
    console.error('deleteConversation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  deleteConversation
};
