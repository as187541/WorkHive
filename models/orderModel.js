// models/orderModel.js
const mongoose = require('mongoose');

const milestoneSubSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'Submitted', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  rejectionReason: { type: String }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  // Parties
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer is required']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required']
  },

  // Source
  servicePackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicePackage'
  },
  jobPosting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPosting'
  },
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  },

  // Context
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  // Order details
  title: {
    type: String,
    required: [true, 'Order title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
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
  revisions: {
    type: Number,
    default: 0,
    min: [0, 'Revisions cannot be negative']
  },
  revisionsRemaining: {
    type: Number,
    default: 0,
    min: [0, 'Revisions remaining cannot be negative']
  },
  features: [{
    type: String,
    trim: true
  }],

  // Status tracking
  status: {
    type: String,
    enum: [
      'Created',
      'Funded',
      'In Progress',
      'Delivered',
      'Revision',
      'Accepted',
      'Disputed',
      'Cancelled'
    ],
    default: 'Created'
  },

  // Milestones (for larger orders)
  milestones: [milestoneSubSchema],

  // Escrow tracking
  escrow: {
    funded: { type: Boolean, default: false },
    fundedAt: { type: Date },
    amount: { type: Number, default: 0 },
    releasedAt: { type: Date },
    releasedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Delivery tracking
  delivery: {
    message: { type: String, default: '' },
    attachments: [{
      url: { type: String, required: true },
      name: { type: String, required: true },
      publicId: { type: String }
    }],
    deliveredAt: { type: Date }
  },

  // Dispute tracking
  dispute: {
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['None', 'Open', 'Under Review', 'Resolved'],
      default: 'None'
    },
    resolution: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    outcome: {
      type: String,
      enum: ['None', 'Refund Buyer', 'Release to Seller', 'Split'],
      default: 'None'
    }
  },

  // Invoice
  invoice: {
    number: { type: String },
    generatedAt: { type: Date }
  },

  // Financials
  platformFee: { type: Number, default: 0 },
  sellerPayout: { type: Number, default: 0 },

  // Notes / messages between parties
  notes: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
  }],

  // Important dates
  fundedAt: { type: Date },
  acceptedAt: { type: Date },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
  deadline: { type: Date }
}, { timestamps: true });

// Indexes for fast lookups
orderSchema.index({ buyer: 1, status: 1, createdAt: -1 });
orderSchema.index({ seller: 1, status: 1, createdAt: -1 });
orderSchema.index({ workspace: 1, status: 1 });
orderSchema.index({ servicePackage: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);