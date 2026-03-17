/**
 * ExecutionDataLayer - Thin wrapper around the execution storage adapter
 */

class ExecutionDataLayer {
  constructor(adapter) {
    this.adapter = adapter;
  }

  async saveExecution(data) {
    return this.adapter.save(data);
  }

  async getExecution(id) {
    return this.adapter.get(id);
  }

  async getAllExecutions() {
    return this.adapter.getAll();
  }

  async getExecutionsByWorkflow(workflowId) {
    return this.adapter.getByWorkflowId(workflowId);
  }

  async deleteExecution(id) {
    return this.adapter.delete(id);
  }
}

module.exports = ExecutionDataLayer;
