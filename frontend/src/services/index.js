/**
 * Service Factory - Creates and configures services
 * Central place to configure storage adapters and services
 */

import WorkflowService from './WorkflowService';
import ExecutionService from './ExecutionService';
import LocalStorageAdapter from './storage/LocalStorageAdapter';
import ApiAdapter from './storage/ApiAdapter';

// Determine which adapter to use based on environment
const useBackend = process.env.REACT_APP_USE_BACKEND === 'true' || 
                   process.env.NODE_ENV === 'development';

// Create storage adapter instance
const storageAdapter = useBackend ? new ApiAdapter() : new LocalStorageAdapter('git-workflow-');

// Create workflow service instance
const workflowService = new WorkflowService(storageAdapter);

// Create execution service instance
const executionService = new ExecutionService();

// Export services
export { workflowService, executionService, storageAdapter };

// Export service factory for future extensibility
export const createWorkflowService = (adapter) => {
  return new WorkflowService(adapter);
};

// Export adapters for future use
export { LocalStorageAdapter, ApiAdapter };

// Default export
const services = {
  workflowService,
  executionService,
  storageAdapter
};

export default services;