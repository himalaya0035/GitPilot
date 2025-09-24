/**
 * WorkflowService - Data layer for workflow management
 * Provides a clean abstraction for workflow CRUD operations
 * Can be easily swapped to use different storage backends (localStorage, API, database)
 */

class WorkflowService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.workflows = new Map();
    this.loadWorkflows();
  }

  /**
   * Load all workflows from storage
   */
  async loadWorkflows() {
    try {
      const workflows = await this.storage.getAll();
      
      this.workflows.clear();
      workflows.forEach(workflow => {
        // Use _id if id is not available (MongoDB compatibility)
        const workflowId = workflow.id || workflow._id;
        this.workflows.set(workflowId, workflow);
      });
      
      return Array.from(this.workflows.values());
    } catch (error) {
      console.error('Failed to load workflows:', error);
      return [];
    }
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id) {
    return this.workflows.get(id) || null;
  }

  /**
   * Save a new workflow
   */
  async saveWorkflow(workflowData) {
    try {
      // Generate ID if not provided
      const id = workflowData.id || this.generateId();
      
      // Add metadata
      const workflow = {
        ...workflowData,
        id,
        createdAt: workflowData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: workflowData.version || 1
      };

      // Save to storage
      await this.storage.save(workflow);
      
      // Update in-memory cache
      this.workflows.set(id, workflow);
      
      return workflow;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw new Error('Failed to save workflow');
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id, updates) {
    try {
      const existingWorkflow = this.workflows.get(id);
      if (!existingWorkflow) {
        throw new Error('Workflow not found');
      }

      const updatedWorkflow = {
        ...existingWorkflow,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        version: (existingWorkflow.version || 1) + 1
      };

      // Save to storage
      await this.storage.save(updatedWorkflow);
      
      // Update in-memory cache
      this.workflows.set(id, updatedWorkflow);
      
      return updatedWorkflow;
    } catch (error) {
      console.error('Failed to update workflow:', error);
      throw new Error('Failed to update workflow');
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id) {
    try {
      const workflow = this.workflows.get(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Remove from storage
      await this.storage.delete(id);
      
      // Remove from in-memory cache
      this.workflows.delete(id);
      
      return true;
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      throw new Error('Failed to delete workflow');
    }
  }

  /**
   * Search workflows by name or description
   */
  async searchWorkflows(query) {
    const allWorkflows = Array.from(this.workflows.values());
    const lowercaseQuery = query.toLowerCase();
    
    return allWorkflows.filter(workflow => 
      workflow.name.toLowerCase().includes(lowercaseQuery) ||
      (workflow.description && workflow.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get workflows by branch type
   */
  async getWorkflowsByBranchType(branchType) {
    const allWorkflows = Array.from(this.workflows.values());
    
    return allWorkflows.filter(workflow => 
      workflow.branches && workflow.branches.some(branch => branch.type === branchType)
    );
  }

  /**
   * Duplicate a workflow
   */
  async duplicateWorkflow(id, newName) {
    try {
      const originalWorkflow = this.workflows.get(id);
      if (!originalWorkflow) {
        throw new Error('Workflow not found');
      }

      const duplicatedWorkflow = {
        ...originalWorkflow,
        id: this.generateId(),
        name: newName || `${originalWorkflow.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      return await this.saveWorkflow(duplicatedWorkflow);
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
      throw new Error('Failed to duplicate workflow');
    }
  }

  /**
   * Export workflow as JSON
   */
  exportWorkflow(id) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const exportData = {
      ...workflow,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(jsonData, newName = null) {
    try {
      const workflowData = JSON.parse(jsonData);
      
      // Validate required fields
      if (!workflowData.name || !workflowData.branches || !workflowData.operations) {
        throw new Error('Invalid workflow format');
      }

      const importedWorkflow = {
        ...workflowData,
        id: this.generateId(),
        name: newName || workflowData.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      return await this.saveWorkflow(importedWorkflow);
    } catch (error) {
      console.error('Failed to import workflow:', error);
      throw new Error('Failed to import workflow');
    }
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    const workflows = Array.from(this.workflows.values());
    
    return {
      total: workflows.length,
      byType: workflows.reduce((acc, workflow) => {
        const branchTypes = new Set(workflow.branches?.map(b => b.type) || []);
        branchTypes.forEach(type => {
          acc[type] = (acc[type] || 0) + 1;
        });
        return acc;
      }, {}),
      recentlyCreated: workflows
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    };
  }
}

export default WorkflowService;