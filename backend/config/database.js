/**
 * Database Configuration
 * Handles MongoDB connection configuration and environment variables
 */

require('dotenv').config();

const config = {
  // MongoDB connection settings
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/GitPilot',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000
    }
  },
  
  // Database settings
  database: {
    name: process.env.DB_NAME || 'GitPilot',
    collection: process.env.COLLECTION_NAME || 'workflows'
  },
  
  // Environment settings
  environment: process.env.NODE_ENV || 'development',
  
  // Connection retry settings
  retry: {
    maxAttempts: 3,
    delay: 1000
  }
};

/**
 * Get MongoDB connection string
 */
function getConnectionString() {
  return config.mongodb.uri;
}

/**
 * Get MongoDB connection options
 */
function getConnectionOptions() {
  return config.mongodb.options;
}

/**
 * Get database configuration
 */
function getDatabaseConfig() {
  return config.database;
}

/**
 * Check if running in production
 */
function isProduction() {
  return config.environment === 'production';
}

/**
 * Check if running in development
 */
function isDevelopment() {
  return config.environment === 'development';
}

/**
 * Get retry configuration
 */
function getRetryConfig() {
  return config.retry;
}

module.exports = {
  config,
  getConnectionString,
  getConnectionOptions,
  getDatabaseConfig,
  isProduction,
  isDevelopment,
  getRetryConfig
};