const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Please provide a task title'], 
    trim: true 
  },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['Todo', 'In Progress', 'Done'], 
    default: 'Todo' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  // --- MAKE SURE THIS FIELD EXISTS ---
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
    attachments: [{
        url: { type: String, required: true },
        name: { type: String, required: true },
        publicId: { type: String, required: true }, // Needed to delete the file later
        createdAt: { type: Date, default: Date.now }
    }]
    }, { timestamps: true });



module.exports = mongoose.model('Task', taskSchema);