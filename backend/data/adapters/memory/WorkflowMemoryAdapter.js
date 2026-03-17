/**
 * MemoryAdapter - In-memory storage adapter
 * Stores data in memory for development and testing
 * Compatible with the frontend LocalStorageAdapter interface
 */

class MemoryAdapter {
  constructor(prefix = 'git-workflow-') {
    this.prefix = prefix;
    this.storage = new Map();
  }

  /**
   * Get all workflows from memory
   */
  async getAll() {
    const workflows = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(this.prefix)) {
        workflows.push(value);
      }
    }
    return workflows;
  }

  /**
   * Get a specific workflow by ID
   */
  async get(id) {
    const key = `${this.prefix}${id}`;
    return this.storage.get(key) || null;
  }

  /**
   * Get a specific workflow synchronously (for export)
   */
  getSync(id) {
    const key = `${this.prefix}${id}`;
    return this.storage.get(key) || null;
  }

  /**
   * Save a workflow to memory
   */
  async save(workflow) {
    const key = `${this.prefix}${workflow.id}`;
    this.storage.set(key, workflow);
    return workflow;
  }

  /**
   * Delete a workflow from memory
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

module.exports = MemoryAdapter;
