/**
 * ExecutionMongoAdapter - MongoDB storage adapter for executions
 * Provides persistent storage for execution records
 */

const mongoose = require('mongoose');
const Execution = require('../models/Execution');

class ExecutionMongoAdapter {
  constructor(connectionString, options = {}) {
    this.connectionString = connectionString;
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...options
    };
    this.isConnected = false;
  }

  /**
   * Initialize MongoDB connection (reuses existing connection if already open)
   */
  async connect() {
    if (this.isConnected) {
      return;
    }
    try {
      if (mongoose.connection.readyState === 1) {
        this.isConnected = true;
        return;
      }
      await mongoose.connect(this.connectionString, this.options);
      this.isConnected = true;
      console.log('MongoDB connected (execution adapter)');
    } catch (error) {
      console.error('MongoDB connection error (execution adapter):', error);
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  /**
   * Close MongoDB connection
   */
  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Ensure connection is established
   */
  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Get all executions sorted by startTime descending
   */
  async getAll() {
    await this.ensureConnection();
    try {
      const executions = await Execution.find({}).sort({ startTime: -1 });
      return executions.map(e => e.toJSON());
    } catch (error) {
      console.error('Error fetching all executions:', error);
      throw new Error(`Failed to fetch executions: ${error.message}`);
    }
  }

  /**
   * Get a specific execution by ID
   */
  async get(id) {
    await this.ensureConnection();
    try {
      const execution = await Execution.findOne({ id });
      return execution ? execution.toJSON() : null;
    } catch (error) {
      console.error(`Error fetching execution ${id}:`, error);
      throw new Error(`Failed to fetch execution: ${error.message}`);
    }
  }

  /**
   * Save an execution record (upsert)
   */
  async save(execution) {
    await this.ensureConnection();
    try {
      const { id } = execution;
      await Execution.replaceOne({ id }, execution, { upsert: true });
      return execution;
    } catch (error) {
      console.error('Error saving execution:', error);
      throw new Error(`Failed to save execution: ${error.message}`);
    }
  }

  /**
   * Delete an execution record
   */
  async delete(id) {
    await this.ensureConnection();
    try {
      const result = await Execution.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting execution ${id}:`, error);
      throw new Error(`Failed to delete execution: ${error.message}`);
    }
  }

  /**
   * Get all executions for a specific workflow, sorted by startTime descending
   */
  async getByWorkflowId(workflowId) {
    await this.ensureConnection();
    try {
      const executions = await Execution.find({ workflowId }).sort({ startTime: -1 });
      return executions.map(e => e.toJSON());
    } catch (error) {
      console.error(`Error fetching executions for workflow ${workflowId}:`, error);
      throw new Error(`Failed to fetch executions by workflow: ${error.message}`);
    }
  }
}

module.exports = ExecutionMongoAdapter;
