/**
 * Workflow Mongoose Schema
 * Defines the structure and validation for workflow documents
 */

const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['feature', 'bugfix', 'hotfix', 'release', 'develop', 'production', 'integration', 'other']
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  autoPull: {
    type: Boolean,
    default: false
  },
  autoPullRemote: {
    type: String,
    default: 'origin'
  },
  autoPush: {
    type: Boolean,
    default: false
  },
  autoPushRemote: {
    type: String,
    default: 'origin'
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  tags: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, { _id: false });

const operationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['checkout', 'merge', 'rebase', 'push', 'pull', 'delete-branch', 'tag']
  },
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  repositoryPath: {
    type: String,
    default: null
  },
  branches: {
    type: [branchSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one branch is required'
    }
  },
  operations: {
    type: [operationSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one operation is required'
    }
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  tags: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'workflows'
});

// Indexes for better query performance
workflowSchema.index({ name: 'text' });
workflowSchema.index({ id: 1 }, { unique: true });
workflowSchema.index({ 'branches.type': 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
workflowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});


module.exports = mongoose.model('Workflow', workflowSchema);