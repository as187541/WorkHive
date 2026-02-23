const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  workspace: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true 
  },
  invitedUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Declined'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Invitation', invitationSchema);