/**
 * MongoAdapter - MongoDB storage adapter using Mongoose
 * Provides persistent storage for workflows with full CRUD operations
 * Compatible with the MemoryAdapter interface
 */

const mongoose = require('mongoose');
const Workflow = require('../models/Workflow');

class MongoAdapter {
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
   * Initialize MongoDB connection
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(this.connectionString, this.options);
      this.isConnected = true;
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
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
      console.log('MongoDB disconnected');
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
   * Get all workflows from MongoDB
   */
  async getAll() {
    await this.ensureConnection();
    
    try {
      // Get active workflows only
      const activeWorkflows = await Workflow.find({ isActive: true })
        .sort({ createdAt: -1 });
      
      // Convert to JSON to ensure virtual fields are included
      return activeWorkflows.map(workflow => workflow.toJSON());
    } catch (error) {
      console.error('Error fetching all workflows:', error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
  }

  /**
   * Get a specific workflow by id
   */
  async get(id) {
    await this.ensureConnection();
    
    try {
      const workflow = await Workflow.findOne({ id: id, isActive: true });
      return workflow ? workflow.toJSON() : null;
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  }

  /**
   * Get a specific workflow synchronously (for export)
   * Note: This is not truly synchronous with MongoDB, but provides the same interface
   */
  async getSync(id) {
    return await this.get(id);
  }

  /**
   * Save a workflow to MongoDB
   */
  async save(workflow) {
    await this.ensureConnection();
    
    try {
      // Use the workflow's id
      const id = workflow.id;
      
      // Use replaceOne with upsert to handle both insert and update
      const result = await Workflow.replaceOne(
        { id: id },
        { ...workflow, id: id, isActive: true },
        { upsert: true }
      );
      
      return workflow;
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw new Error(`Failed to save workflow: ${error.message}`);
    }
  }

  /**
   * Delete a workflow from MongoDB (hard delete - permanent removal)
   */
  async delete(id) {
    await this.ensureConnection();
    
    try {
      const result = await Workflow.deleteOne({ id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }


  /**
   * Clear all workflows (for testing)
   * Note: This performs a hard delete for testing purposes
   */
  async clear() {
    await this.ensureConnection();
    
    try {
      const result = await Workflow.deleteMany({});
      console.log(`Cleared ${result.deletedCount} workflows`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing workflows:', error);
      throw new Error(`Failed to clear workflows: ${error.message}`);
    }
  }

  /**
   * Get storage size (count of active workflows)
   */
  async getSize() {
    await this.ensureConnection();
    
    try {
      const count = await Workflow.countDocuments({ isActive: true });
      return count;
    } catch (error) {
      console.error('Error getting storage size:', error);
      throw new Error(`Failed to get storage size: ${error.message}`);
    }
  }

  /**
   * Search workflows by text (name or description)
   */
  async search(query) {
    await this.ensureConnection();
    
    try {
      const workflows = await Workflow.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      }).sort({ createdAt: -1 }).lean();
      
      return workflows;
    } catch (error) {
      console.error('Error searching workflows:', error);
      throw new Error(`Failed to search workflows: ${error.message}`);
    }
  }

  /**
   * Get workflows by branch type
   */
  async getByBranchType(branchType) {
    await this.ensureConnection();
    
    try {
      const workflows = await Workflow.find({
        isActive: true,
        'branches.type': branchType
      }).sort({ createdAt: -1 }).lean();
      
      return workflows;
    } catch (error) {
      console.error(`Error fetching workflows by branch type ${branchType}:`, error);
      throw new Error(`Failed to fetch workflows by branch type: ${error.message}`);
    }
  }

  /**
   * Get workflow statistics
   */
  async getStats() {
    await this.ensureConnection();
    
    try {
      const total = await Workflow.countDocuments({ isActive: true });
      
      const branchTypeStats = await Workflow.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$branches' },
        { $group: { _id: '$branches.type', count: { $sum: 1 } } }
      ]);
      
      const byType = {};
      branchTypeStats.forEach(stat => {
        byType[stat._id] = stat.count;
      });
      
      const recentlyCreated = await Workflow.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name createdAt')
        .lean();
      
      return {
        total,
        byType,
        recentlyCreated
      };
    } catch (error) {
      console.error('Error getting workflow stats:', error);
      throw new Error(`Failed to get workflow stats: ${error.message}`);
    }
  }

  /**
   * Get connection status
   */
  isConnectedToDatabase() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      await this.ensureConnection();
      const stats = await this.getStats();
      return {
        connected: this.isConnectedToDatabase(),
        totalWorkflows: stats.total,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = MongoAdapter;