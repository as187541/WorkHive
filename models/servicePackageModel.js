const mongoose = require('mongoose');

const servicePackageSchema = new mongoose.Schema({
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer is required']
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    enum: ['HT', 'USD'],
    default: 'HT'
  },
  deliveryDays: {
    type: Number,
    required: [true, 'Please provide delivery time in days'],
    min: [1, 'Delivery time must be at least 1 day']
  },
  revisions: {
    type: Number,
    default: 0,
    min: [0, 'Revisions cannot be negative']
  },
  features: [{
    type: String,
    trim: true
  }],
  images: [{
    url: { type: String, required: true },
    publicId: { type: String }
  }],
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Deleted'],
    default: 'Active'
  },
  ratingAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Index for fast lookups
servicePackageSchema.index({ freelancer: 1, status: 1 });
servicePackageSchema.index({ category: 1, status: 1 });
servicePackageSchema.index({ skills: 1, status: 1 });
servicePackageSchema.index({ price: 1, status: 1 });
servicePackageSchema.index({ ratingAverage: -1, status: 1 });

module.exports = mongoose.model('ServicePackage', servicePackageSchema);
