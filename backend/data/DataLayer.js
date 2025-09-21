/**
 * DataLayer - Abstract data access layer
 * Provides a clean interface for data operations that can be easily swapped
 * between different storage backends (memory, localStorage, database, etc.)
 */

class DataLayer {
  constructor(adapter) {
    this.adapter = adapter;
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows() {
    return await this.adapter.getAll();
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id) {
    return await this.adapter.get(id);
  }

  /**
   * Save a new workflow
   */
  async saveWorkflow(workflowData) {
    const id = workflowData.id || this.generateId();
    const workflow = {
      ...workflowData,
      id,
      createdAt: workflowData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: workflowData.version || 1
    };
    
    await this.adapter.save(workflow);
    return workflow;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id, updates) {
    const existingWorkflow = await this.adapter.get(id);
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

    await this.adapter.save(updatedWorkflow);
    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id) {
    const workflow = await this.adapter.get(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await this.adapter.delete(id);
    return true;
  }

  /**
   * Search workflows by name or description
   */
  async searchWorkflows(query) {
    const allWorkflows = await this.adapter.getAll();
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
    const allWorkflows = await this.adapter.getAll();
    
    return allWorkflows.filter(workflow => 
      workflow.branches && workflow.branches.some(branch => branch.type === branchType)
    );
  }

  /**
   * Duplicate a workflow
   */
  async duplicateWorkflow(id, newName) {
    const originalWorkflow = await this.adapter.get(id);
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
  }

  /**
   * Export workflow as JSON
   */
  exportWorkflow(id) {
    const workflow = this.adapter.getSync(id);
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
  }

  /**
   * Get workflow statistics
   */
  async getStats() {
    const workflows = await this.adapter.getAll();
    
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

  /**
   * Generate a unique ID
   */
  generateId() {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = DataLayer;