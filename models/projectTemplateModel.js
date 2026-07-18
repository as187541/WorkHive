const mongoose = require('mongoose');

const projectTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a template name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Web App', 'Mobile App', 'Marketing Campaign', 'Design System', 'Data Pipeline', 'Custom'],
    default: 'Custom'
  },
  phases: [{
    name: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 }
  }],
  defaultTasks: [{
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    tags: [{ type: String }],
    phase: { type: String },
    estimatedDays: { type: Number, default: 1 }
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
