/**
 * Shared Data Layer Instance
 * Provides a single instance of DataLayer that can be used across all routes
 */

const DataLayer = require('./DataLayer');
const MemoryAdapter = require('./adapters/MemoryAdapter');

// Create a single shared instance
const memoryAdapter = new MemoryAdapter('git-workflow-');
const dataLayer = new DataLayer(memoryAdapter);

module.exports = dataLayer;