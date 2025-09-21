/**
 * LocalStorageAdapter - Browser localStorage adapter
 * Compatible with the frontend LocalStorageAdapter interface
 * This is a server-side implementation that mimics localStorage behavior
 */

class LocalStorageAdapter {
  constructor(prefix = 'git-workflow-') {
    this.prefix = prefix;
    this.storage = new Map();
  }

  /**
   * Get all workflows from storage
   */
  async getAll() {
    const workflows = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(this.prefix)) {
        try {
          const parsed = JSON.parse(value);
          workflows.push(parsed);
        } catch (error) {
          console.error(`Error parsing stored workflow ${key}:`, error);
        }
      }
    }
    return workflows;
  }

  /**
   * Get a specific workflow by ID
   */
  async get(id) {
    const key = `${this.prefix}${id}`;
    const value = this.storage.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Error parsing workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Get a specific workflow synchronously (for export)
   */
  getSync(id) {
    const key = `${this.prefix}${id}`;
    const value = this.storage.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Error parsing workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Save a workflow to storage
   */
  async save(workflow) {
    const key = `${this.prefix}${workflow.id}`;
    const serialized = JSON.stringify(workflow);
    this.storage.set(key, serialized);
    return workflow;
  }

  /**
   * Delete a workflow from storage
   */
  async delete(id) {
    const key = `${this.prefix}${id}`;
    return this.storage.delete(key);
  }

  /**
   * Clear all workflows (for testing)
   */
  async clear() {
    for (const key of this.storage.keys()) {
      if (key.startsWith(this.prefix)) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Get storage size
   */
  getSize() {
    return this.storage.size;
  }
}

module.exports = LocalStorageAdapter;