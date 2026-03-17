/**
 * Execution Mongoose Schema
 * Stores immutable execution records for history browsing
 */

const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  workflowId: {
    type: String,
    required: true
  },
  workflowName: {
    type: String,
    default: null
  },
  repositoryPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'stopped'],
    required: true
  },
  startTime: {
    type: String,
    default: null
  },
  endTime: {
    type: String,
    default: null
  },
  durationMs: {
    type: Number,
    default: null
  },
  operations: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  branches: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  logs: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  error: {
    type: String,
    default: null
  }
}, {
  collection: 'executions'
});

executionSchema.index({ id: 1 }, { unique: true });
executionSchema.index({ workflowId: 1 });
executionSchema.index({ startTime: -1 });
executionSchema.index({ status: 1 });

module.exports = mongoose.model('Execution', executionSchema);
