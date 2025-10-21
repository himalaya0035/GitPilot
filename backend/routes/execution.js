/**
 * Execution routes - Workflow execution and monitoring
 * Handles workflow execution with real-time updates via Socket.IO
 */

const express = require('express');
const router = express.Router();
const { validateWorkflowId, validateRepositoryPath } = require('../middleware/validation');
const GitService = require('../services/GitService');
const WorkflowExecutor = require('../services/WorkflowExecutor');
const WorkflowPreviewService = require('../services/WorkflowPreviewService');

// Store active executors by executionId
const activeExecutors = new Map();

/**
 * POST /api/execution/:id/start
 * Start workflow execution
 */
router.post('/:id/start', validateWorkflowId, validateRepositoryPath, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { repositoryPath } = req.body; // Optional repository path
    const io = req.app.get('io');
    
    // Get workflow from shared data layer
    const dataLayer = require('../data/sharedDataLayer');
    
    const workflow = await dataLayer.getWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }

    // SECURITY: Prevent execution on GitPilot repository
    const gitPilotRepoPath = process.cwd();
    const targetRepoPath = repositoryPath || gitPilotRepoPath;
    
    // Check if trying to execute on GitPilot repository
    if (targetRepoPath === gitPilotRepoPath || 
        targetRepoPath.startsWith(gitPilotRepoPath + '/') ||
        gitPilotRepoPath.startsWith(targetRepoPath + '/')) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Execution on GitPilot repository is not allowed for security reasons',
          gitPilotPath: gitPilotRepoPath,
          requestedPath: targetRepoPath
        }
      });
    }

    // Initialize services with validated repository path
    const gitService = new GitService(targetRepoPath);
    const executor = new WorkflowExecutor(gitService, io);

    // Start execution in background
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store executor for potential stopping
    activeExecutors.set(executionId, executor);
    
    // Send initial response
    res.json({
      success: true,
      data: {
        executionId,
        workflowId: id,
        repositoryPath: repositoryPath || gitService.workingDirectory,
        status: 'started',
        message: 'Workflow execution started'
      }
    });

    // Execute workflow asynchronously
    executor.executeWorkflow(workflow, executionId)
      .then((result) => {
        console.log(`Workflow ${id} execution completed:`, result);
        // Clean up executor reference
        activeExecutors.delete(executionId);
      })
      .catch((error) => {
        console.error(`Workflow ${id} execution failed:`, error);
        // Clean up executor reference
        activeExecutors.delete(executionId);
      });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/execution/:id/preview
 * Preview workflow execution commands
 */
router.post('/:id/preview', validateWorkflowId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { repositoryPath } = req.body;
    
    // Get workflow from shared data layer
    const dataLayer = require('../data/sharedDataLayer');
    const workflow = await dataLayer.getWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }

    // Use the new preview service
    const previewService = new WorkflowPreviewService();
    const preview = await previewService.generatePreview(workflow, repositoryPath || process.cwd());
    
    res.json({
      success: true,
      data: preview
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/execution/:id/status
 * Get execution status
 */
router.get('/:id/status', validateWorkflowId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // For now, return basic status
    // In a real implementation, this would track execution state
    res.json({
      success: true,
      data: {
        executionId: id,
        status: 'running', // or 'completed', 'failed', 'pending'
        message: 'Execution status retrieved'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/execution/:id/stop
 * Stop workflow execution
 */
router.post('/:id/stop', validateWorkflowId, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get the executor for this execution
    const executor = activeExecutors.get(id);
    
    if (!executor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Execution not found or already completed' }
      });
    }
    
    // Stop the execution using the executor
    executor.stopExecution(id);
    
    // Clean up executor reference
    activeExecutors.delete(id);

    res.json({
      success: true,
      data: {
        executionId: id,
        status: 'stopped',
        message: 'Workflow execution stopped'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;