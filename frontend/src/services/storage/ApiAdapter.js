/**
 * ApiAdapter - Backend API storage adapter
 * Replaces LocalStorageAdapter to use backend API
 * Maintains compatibility with existing WorkflowService interface
 */

class ApiAdapter {
  constructor(baseUrl = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all workflows from backend API
   */
  async getAll() {
    try {
      const response = await fetch(`${this.baseUrl}/workflows`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch workflows');
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      throw error;
    }
  }

  /**
   * Get a specific workflow by id
   */
  async get(id) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${id}`);
      const result = await response.json();
      
      if (!result.success) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(result.error?.message || 'Failed to fetch workflow');
      }
      
      return result.data;
    } catch (error) {
      console.error(`Failed to fetch workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save a workflow to backend API
   */
  async save(workflow) {
    try {
      const isUpdate = workflow.id && await this.get(workflow.id);
      const url = isUpdate ? `${this.baseUrl}/workflows/${workflow.id}` : `${this.baseUrl}/workflows`;
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || `Failed to ${isUpdate ? 'update' : 'save'} workflow`);
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow from backend API
   */
  async delete(id) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        if (response.status === 404) {
          return false; // Already deleted or doesn't exist
        }
        throw new Error(result.error?.message || 'Failed to delete workflow');
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search workflows
   */
  async search(query) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to search workflows');
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Failed to search workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflows by branch type
   */
  async getByBranchType(branchType) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/type/${encodeURIComponent(branchType)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch workflows by type');
      }
      
      return result.data || [];
    } catch (error) {
      console.error(`Failed to fetch workflows by type ${branchType}:`, error);
      throw error;
    }
  }

  /**
   * Duplicate a workflow
   */
  async duplicate(id, newName) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to duplicate workflow');
      }
      
      return result.data;
    } catch (error) {
      console.error(`Failed to duplicate workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Export workflow as JSON
   */
  async export(id) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${id}/export`);
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to export workflow');
      }
      
      return await response.text();
    } catch (error) {
      console.error(`Failed to export workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Import workflow from JSON
   */
  async import(jsonData, newName) {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jsonData, newName })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to import workflow');
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to import workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getStats() {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/stats`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch stats');
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw error;
    }
  }

  /**
   * Check if backend is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/api/health`);
      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

export default ApiAdapter;