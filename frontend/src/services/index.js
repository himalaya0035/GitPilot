/**
 * Service Factory - Creates and configures services
 * Central place to configure storage adapters and services
 */

import WorkflowService from './WorkflowService';
import ExecutionService from './ExecutionService';
import PlaygroundExecutionService from './PlaygroundExecutionService';
import LocalStorageAdapter from './storage/LocalStorageAdapter';
import ApiAdapter from './storage/ApiAdapter';

// Playground mode detection
export const isPlayground = process.env.REACT_APP_PLAYGROUND === 'true';

// Determine which adapter to use based on environment
const useBackend = !isPlayground && (
  process.env.REACT_APP_USE_BACKEND === 'true' ||
  process.env.NODE_ENV === 'development'
);

// Create storage adapter instance — playground always uses localStorage
const storageAdapter = useBackend ? new ApiAdapter() : new LocalStorageAdapter('git-workflow-');

// Create workflow service instance
const workflowService = new WorkflowService(storageAdapter);

// Create execution service instance — playground uses simulated execution
const executionService = isPlayground
  ? new PlaygroundExecutionService(workflowService)
  : new ExecutionService();

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
