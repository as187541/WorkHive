const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rater is required']
  },
  ratee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ratee is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace is required']
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [1, 'Minimum score is 1'],
    max: [5, 'Maximum score is 5']
  },
  review: {
    type: String,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    default: ''
  }
}, { timestamps: true });

// Prevent duplicate ratings for the same rater-ratee-project combination
ratingSchema.index({ rater: 1, ratee: 1, project: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
