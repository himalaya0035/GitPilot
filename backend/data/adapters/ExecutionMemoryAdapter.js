/**
 * ExecutionMemoryAdapter - In-memory storage adapter for executions
 * Stores execution records in memory for development and testing
 */

class ExecutionMemoryAdapter {
  constructor() {
    this.prefix = 'execution-';
    this.storage = new Map();
  }

  /**
   * Get all executions sorted by startTime descending
   */
  async getAll() {
    const executions = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(this.prefix)) {
        executions.push(value);
      }
    }
    executions.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeB - timeA;
    });
    return executions;
  }

  /**
   * Get a specific execution by ID
   */
  async get(id) {
    const key = `${this.prefix}${id}`;
    return this.storage.get(key) || null;
  }

  /**
   * Save an execution record
   */
  async save(execution) {
    const key = `${this.prefix}${execution.id}`;
    this.storage.set(key, execution);
    return execution;
  }

  /**
   * Delete an execution record
   */
  async delete(id) {
    const key = `${this.prefix}${id}`;
    return this.storage.delete(key);
  }

  /**
   * Get all executions for a specific workflow, sorted by startTime descending
   */
  async getByWorkflowId(workflowId) {
    const executions = [];
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(this.prefix) && value.workflowId === workflowId) {
        executions.push(value);
      }
    }
    executions.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeB - timeA;
    });
    return executions;
  }
}

module.exports = ExecutionMemoryAdapter;
