// models/savedSearchModel.js
const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this search'],
    trim: true,
    maxlength: 100
  },
  filters: {
    skills: { type: String, default: '' },
    minRating: { type: String, default: '' },
    availability: { type: String, default: '' },
    search: { type: String, default: '' },
    sort: { type: String, default: 'rating' },
    lastActive: { type: String, default: '' }
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

savedSearchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);