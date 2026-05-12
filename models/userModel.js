// models/userModel.js (Definitive Version)
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a name'] },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please provide a valid email'],
  },
  password: { type: String,  minlength: 6, select: false },
  // --- THIS IS THE NEW FIELD ---
  role: {
    type: String,
    enum: ['User', 'SuperAdmin'], // Only allows these two values
    default: 'User',
  },
  avatar: { type: String, default: '' },
  otp: { type: String },
  otpExpires: { type: Date },
  wallet: {
    balance: { type: Number, default: 0 },
    workspaces: [{
      workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
      balance: { type: Number, default: 0 }
    }],
    history: [{
      amount: Number,
      reason: String,
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
      date: { type: Date, default: Date.now }
    }]
  },
  // --- TALENT PROFILE FIELDS ---
  bio: { type: String, maxlength: 500, default: '' },
  skills: [{ type: String, trim: true }],
  portfolio: [{
    title: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 1000, default: '' },
    url: { type: String, default: '' },
    image: { type: String, default: '' }
  }],
  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  totalCompletedProjects: { type: Number, default: 0, min: 0 },
  availabilityStatus: {
    type: String,
    enum: ['Open to work', 'Busy', 'Not available'],
    default: 'Open to work'
  },
  hourlyRate: { type: Number, min: 0, default: null }
},
{ timestamps: true });

module.exports = mongoose.model('User', UserSchema);