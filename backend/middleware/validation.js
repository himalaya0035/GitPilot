/**
 * Validation middleware for workflow data
 * Validates workflow JSON schema according to project rules
 */

/**
 * Validate workflow schema
 */
const validateWorkflow = (req, res, next) => {
  const { body } = req;
  
  try {
    // Required fields validation
    if (!body.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Workflow name is required' }
      });
    }

    if (!body.branches || !Array.isArray(body.branches)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Branches array is required' }
      });
    }

    if (!body.operations || !Array.isArray(body.operations)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Operations array is required' }
      });
    }

    // Validate branches
    for (const branch of body.branches) {
      if (!branch.id || !branch.name || !branch.type) {
        return res.status(400).json({
          success: false,
          error: { message: 'Each branch must have id, name, and type' }
        });
      }

      // Validate branch types (from project rules)
      const validBranchTypes = ['production', 'feature', 'release', 'hotfix', 'develop', 'staging', 'integration'];
      if (!validBranchTypes.includes(branch.type)) {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid branch type: ${branch.type}. Must be one of: ${validBranchTypes.join(', ')}` }
        });
      }
    }

    // Validate operations
    for (const operation of body.operations) {
      if (!operation.id || !operation.type || !operation.source || !operation.target) {
        return res.status(400).json({
          success: false,
          error: { message: 'Each operation must have id, type, source, and target' }
        });
      }

      // Validate operation types (from project rules)
      const validOperationTypes = ['checkout', 'merge', 'rebase', 'push', 'pull', 'delete-branch', 'tag'];
      if (!validOperationTypes.includes(operation.type)) {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid operation type: ${operation.type}. Must be one of: ${validOperationTypes.join(', ')}` }
        });
      }

      // Validate status field if present
      if (operation.status) {
        const validStatuses = ['pending', 'running', 'success', 'failed'];
        if (!validStatuses.includes(operation.status)) {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid operation status: ${operation.status}. Must be one of: ${validStatuses.join(', ')}` }
          });
        }
      }
    }

    // Validate that all operation sources and targets reference existing branches
    const branchIds = new Set(body.branches.map(b => b.id));
    for (const operation of body.operations) {
      if (!branchIds.has(operation.source)) {
        return res.status(400).json({
          success: false,
          error: { message: `Operation source branch '${operation.source}' not found in branches` }
        });
      }
      if (!branchIds.has(operation.target)) {
        return res.status(400).json({
          success: false,
          error: { message: `Operation target branch '${operation.target}' not found in branches` }
        });
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid workflow data format' }
    });
  }
};

/**
 * Validate workflow ID parameter
 */
const validateWorkflowId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || id.trim() === '') {
    return res.status(400).json({
      success: false,
      error: { message: 'Workflow ID is required' }
    });
  }

  next();
};

/**
 * Validate repository path parameter
 */
const validateRepositoryPath = (req, res, next) => {
  const { repositoryPath } = req.body;
  
  if (repositoryPath && typeof repositoryPath !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'Repository path must be a string' }
    });
  }

  if (repositoryPath && repositoryPath.trim() === '') {
    return res.status(400).json({
      success: false,
      error: { message: 'Repository path cannot be empty' }
    });
  }

  next();
};

module.exports = { validateWorkflow, validateWorkflowId, validateRepositoryPath };