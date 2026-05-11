const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'Conversation is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  // Optional: reference to a service package or hire invitation
  relatedService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicePackage'
  },
  relatedHire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HireInvitation'
  }
}, { timestamps: true });

// Index for fast message lookup by conversation
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
