/**
 * Shared Data Layer Instance
 * Provides a single instance of DataLayer that can be used across all routes
 * Supports both Memory and MongoDB adapters
 */

const DataLayer = require('./DataLayer');
const MemoryAdapter = require('./adapters/MemoryAdapter');
const MongoAdapter = require('./adapters/MongoAdapter');
const { getConnectionString, getConnectionOptions } = require('../config/database');

// Determine which adapter to use based on environment
const useMongoDB = process.env.USE_MONGODB === 'true' || process.env.MONGODB_URI;

let adapter;
let dataLayer;

if (useMongoDB) {
  console.log('Initializing MongoDB adapter...');
  adapter = new MongoAdapter(getConnectionString(), getConnectionOptions());
} else {
  console.log('Initializing Memory adapter...');
  adapter = new MemoryAdapter('git-workflow-');
}

// Create a single shared instance
dataLayer = new DataLayer(adapter);

// If using MongoDB, ensure connection is established
if (useMongoDB) {
  adapter.connect().catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    console.log('Falling back to Memory adapter...');
    
    // Fallback to memory adapter if MongoDB connection fails
    adapter = new MemoryAdapter('git-workflow-');
    dataLayer = new DataLayer(adapter);
  });
}

module.exports = dataLayer;