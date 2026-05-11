const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required']
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  budget: {
    min: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, enum: ['HT', 'USD'], default: 'HT' }
  },
  deadline: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed', 'Filled'],
    default: 'Open'
  },
  visibility: {
    type: String,
    enum: ['Public', 'Workspace'],
    default: 'Public'
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  proposalsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hiredFreelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Indexes for fast lookups
jobPostingSchema.index({ status: 1, createdAt: -1 });
jobPostingSchema.index({ category: 1, status: 1 });
jobPostingSchema.index({ skills: 1, status: 1 });
jobPostingSchema.index({ postedBy: 1, status: 1 });
jobPostingSchema.index({ visibility: 1, status: 1 });

module.exports = mongoose.model('JobPosting', jobPostingSchema);
