// models/connectionModel.js
const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending'
  }
}, { timestamps: true });

// Ensure unique connections (one request per pair)
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Index for quick lookups
connectionSchema.index({ recipient: 1, status: 1 });
connectionSchema.index({ requester: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);