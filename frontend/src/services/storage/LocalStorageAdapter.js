/**
 * LocalStorageAdapter - Storage adapter for localStorage
 * Implements the storage interface for workflow persistence
 */

class LocalStorageAdapter {
  constructor(keyPrefix = 'git-workflow-') {
    this.keyPrefix = keyPrefix;
    this.workflowsKey = `${keyPrefix}workflows`;
    this.metadataKey = `${keyPrefix}metadata`;
  }

  /**
   * Get all workflows from localStorage
   */
  async getAll() {
    try {
      const data = localStorage.getItem(this.workflowsKey);
      if (!data) {
        return [];
      }
      
      const workflows = JSON.parse(data);
      return Array.isArray(workflows) ? workflows : [];
    } catch (error) {
      console.error('Failed to load workflows from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a specific workflow by ID
   */
  async get(id) {
    try {
      const workflows = await this.getAll();
      return workflows.find(workflow => workflow.id === id) || null;
    } catch (error) {
      console.error('Failed to get workflow from localStorage:', error);
      return null;
    }
  }

  /**
   * Save a workflow to localStorage
   */
  async save(workflow) {
    try {
      const workflows = await this.getAll();
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);
      
      if (existingIndex >= 0) {
        // Update existing workflow
        workflows[existingIndex] = workflow;
      } else {
        // Add new workflow
        workflows.push(workflow);
      }
      
      localStorage.setItem(this.workflowsKey, JSON.stringify(workflows));
      await this.updateMetadata();
      
      return workflow;
    } catch (error) {
      console.error('Failed to save workflow to localStorage:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow from localStorage
   */
  async delete(id) {
    try {
      const workflows = await this.getAll();
      const filteredWorkflows = workflows.filter(workflow => workflow.id !== id);
      
      localStorage.setItem(this.workflowsKey, JSON.stringify(filteredWorkflows));
      await this.updateMetadata();
      
      return true;
    } catch (error) {
      console.error('Failed to delete workflow from localStorage:', error);
      throw error;
    }
  }

  /**
   * Clear all workflows
   */
  async clear() {
    try {
      localStorage.removeItem(this.workflowsKey);
      localStorage.removeItem(this.metadataKey);
      return true;
    } catch (error) {
      console.error('Failed to clear workflows from localStorage:', error);
      throw error;
    }
  }

  /**
   * Get storage metadata
   */
  async getMetadata() {
    try {
      const data = localStorage.getItem(this.metadataKey);
      if (!data) {
        return {
          totalWorkflows: 0,
          lastUpdated: null,
          version: '1.0'
        };
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get metadata from localStorage:', error);
      return {
        totalWorkflows: 0,
        lastUpdated: null,
        version: '1.0'
      };
    }
  }

  /**
   * Update storage metadata
   */
  async updateMetadata() {
    try {
      const workflows = await this.getAll();
      const metadata = {
        totalWorkflows: workflows.length,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
      return metadata;
    } catch (error) {
      console.error('Failed to update metadata in localStorage:', error);
      throw error;
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable() {
    try {
      const testKey = `${this.keyPrefix}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage size information
   */
  getStorageInfo() {
    try {
      const workflows = localStorage.getItem(this.workflowsKey) || '';
      const metadata = localStorage.getItem(this.metadataKey) || '';
      
      const totalSize = (workflows.length + metadata.length) * 2; // Rough estimate in bytes
      
      return {
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        workflowsCount: JSON.parse(workflows || '[]').length
      };
    } catch (error) {
      return {
        totalSize: 0,
        totalSizeKB: 0,
        workflowsCount: 0
      };
    }
  }

  /**
   * Export all workflows as JSON
   */
  async exportAll() {
    try {
      const workflows = await this.getAll();
      const metadata = await this.getMetadata();
      
      return JSON.stringify({
        workflows,
        metadata,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }, null, 2);
    } catch (error) {
      console.error('Failed to export workflows:', error);
      throw error;
    }
  }

  /**
   * Import workflows from JSON
   */
  async importAll(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.workflows || !Array.isArray(data.workflows)) {
        throw new Error('Invalid import format');
      }
      
      // Validate each workflow
      for (const workflow of data.workflows) {
        if (!workflow.id || !workflow.name) {
          throw new Error('Invalid workflow format');
        }
      }
      
      // Save all workflows
      localStorage.setItem(this.workflowsKey, JSON.stringify(data.workflows));
      await this.updateMetadata();
      
      return data.workflows.length;
    } catch (error) {
      console.error('Failed to import workflows:', error);
      throw error;
    }
  }
}

export default LocalStorageAdapter;