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
  protection: {
    type: String,
    enum: ['none', 'moderate', 'strict'],
    default: 'none'
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
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
  _id: {
    type: String,
    required: true
  },
  workflowId: {
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
workflowSchema.index({ workflowId: 1 });
workflowSchema.index({ 'branches.type': 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
workflowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for getting workflow ID (since we use _id as the primary identifier)
workflowSchema.virtual('id').get(function() {
  return this._id;
});

// Ensure virtual fields are serialized
workflowSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Workflow', workflowSchema);