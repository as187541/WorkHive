const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  cost: { type: Number, required: true },
  icon: { type: String, default: '🎁' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  stock: { type: Number, default: -1 } // -1 for unlimited
});

module.exports = mongoose.model('Reward', rewardSchema);