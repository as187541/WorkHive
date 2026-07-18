// models/workspaceModel.js
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Collaborator', 'Contractor', 'Guest'], required: true, default: 'Collaborator' },
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a workspace name'], trim: true },
  description: { type: String, default: '' },
  members: [memberSchema],
  tokenBudget: { type: Number, default: Infinity },
  spentTokens: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Workspace', workspaceSchema);