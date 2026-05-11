const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  jobPosting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting',
    required: [true, 'Job posting is required']
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer is required']
  },
  coverLetter: {
    type: String,
    required: [true, 'Cover letter is required'],
    maxlength: [3000, 'Cover letter cannot exceed 3000 characters']
  },
  proposedPrice: {
    type: Number,
    required: [true, 'Proposed price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    enum: ['HT', 'USD'],
    default: 'HT'
  },
  deliveryDays: {
    type: Number,
    required: [true, 'Delivery time is required'],
    min: [1, 'Delivery time must be at least 1 day']
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'],
    default: 'Pending'
  },
  milestones: [{
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    dueDate: { type: Date }
  }]
}, { timestamps: true });

// Prevent duplicate proposals from same freelancer on same job
proposalSchema.index({ jobPosting: 1, freelancer: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);
