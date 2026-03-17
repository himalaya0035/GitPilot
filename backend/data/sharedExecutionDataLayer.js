/**
 * Shared Execution Data Layer Instance
 * Provides a single instance that can be used across all routes
 * Supports both Memory and MongoDB adapters
 */

const ExecutionDataLayer = require('./ExecutionDataLayer');
const ExecutionMemoryAdapter = require('./adapters/memory/ExecutionMemoryAdapter');
const ExecutionMongoAdapter = require('./adapters/mongo/ExecutionMongoAdapter');
const { getConnectionString, getConnectionOptions } = require('../config/database');

const useMongoDB = process.env.USE_MONGODB === 'true' || process.env.MONGODB_URI;

let adapter;
let executionDataLayer;

if (useMongoDB) {
  console.log('Initializing MongoDB adapter for executions...');
  adapter = new ExecutionMongoAdapter(getConnectionString(), getConnectionOptions());
} else {
  console.log('Initializing Memory adapter for executions...');
  adapter = new ExecutionMemoryAdapter();
}

executionDataLayer = new ExecutionDataLayer(adapter);

if (useMongoDB) {
  adapter.connect().catch(error => {
    console.error('Failed to connect to MongoDB for executions:', error);
    console.log('Falling back to Memory adapter for executions...');
    adapter = new ExecutionMemoryAdapter();
    executionDataLayer = new ExecutionDataLayer(adapter);
  });
}

module.exports = executionDataLayer;
