/**
 * Service Factory - Creates and configures services
 * Central place to configure storage adapters and services
 */

import WorkflowService from './WorkflowService';
import LocalStorageAdapter from './storage/LocalStorageAdapter';

// Create storage adapter instance
const storageAdapter = new LocalStorageAdapter('git-workflow-');

// Create workflow service instance
const workflowService = new WorkflowService(storageAdapter);

// Export services
export { workflowService, storageAdapter };

// Export service factory for future extensibility
export const createWorkflowService = (adapter) => {
  return new WorkflowService(adapter);
};

// Export adapters for future use
export { LocalStorageAdapter };

// Default export
const services = {
  workflowService,
  storageAdapter
};

export default services;