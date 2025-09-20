/**
 * Validation utilities for workflow data
 */

export const validateWorkflowName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Workflow name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Workflow name cannot be empty' };
  }
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Workflow name must be at least 3 characters' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Workflow name must be less than 100 characters' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Workflow name contains invalid characters' };
  }
  
  return { isValid: true };
};

export const validateBranchName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Branch name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Branch name cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Branch name must be at least 2 characters' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Branch name must be less than 50 characters' };
  }
  
  // Check for invalid characters (Git branch naming rules)
  const invalidChars = /[~^:?*[\]\\]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Branch name contains invalid characters' };
  }
  
  // Check for consecutive dots
  if (trimmed.includes('..')) {
    return { isValid: false, error: 'Branch name cannot contain consecutive dots' };
  }
  
  // Check for ending with dot
  if (trimmed.endsWith('.')) {
    return { isValid: false, error: 'Branch name cannot end with a dot' };
  }
  
  return { isValid: true };
};

export const validateWorkflowStructure = (workflow) => {
  const errors = [];
  
  if (!workflow) {
    errors.push('Workflow data is required');
    return { isValid: false, errors };
  }
  
  if (!workflow.name) {
    errors.push('Workflow name is required');
  }
  
  if (!workflow.branches || !Array.isArray(workflow.branches)) {
    errors.push('Workflow must have branches array');
  } else if (workflow.branches.length === 0) {
    errors.push('Workflow must have at least one branch');
  }
  
  if (!workflow.operations || !Array.isArray(workflow.operations)) {
    errors.push('Workflow must have operations array');
  }
  
  // Validate branches
  if (workflow.branches && Array.isArray(workflow.branches)) {
    workflow.branches.forEach((branch, index) => {
      if (!branch.id) {
        errors.push(`Branch ${index + 1} is missing ID`);
      }
      if (!branch.name) {
        errors.push(`Branch ${index + 1} is missing name`);
      }
      if (!branch.type) {
        errors.push(`Branch ${index + 1} is missing type`);
      }
    });
  }
  
  // Validate operations
  if (workflow.operations && Array.isArray(workflow.operations)) {
    workflow.operations.forEach((operation, index) => {
      if (!operation.id) {
        errors.push(`Operation ${index + 1} is missing ID`);
      }
      if (!operation.type) {
        errors.push(`Operation ${index + 1} is missing type`);
      }
      if (!operation.source) {
        errors.push(`Operation ${index + 1} is missing source`);
      }
      if (!operation.target) {
        errors.push(`Operation ${index + 1} is missing target`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeWorkflowName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase()
    .substring(0, 100); // Limit length
};

export const sanitizeBranchName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .replace(/[~^:?*[\]\\]/g, '') // Remove invalid characters
    .replace(/\.\./g, '.') // Replace consecutive dots with single dot
    .replace(/\.$/, '') // Remove trailing dot
    .substring(0, 50); // Limit length
};