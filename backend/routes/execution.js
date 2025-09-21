/**
 * Execution routes - Workflow execution and monitoring
 * Handles workflow execution with real-time updates via Socket.IO
 */

const express = require('express');
const router = express.Router();
const { validateWorkflowId } = require('../middleware/validation');
const GitService = require('../services/GitService');
const WorkflowExecutor = require('../services/WorkflowExecutor');

/**
 * POST /api/execution/:id/start
 * Start workflow execution
 */
router.post('/:id/start', validateWorkflowId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');
    
    // Get workflow from data layer
    const DataLayer = require('../data/DataLayer');
    const MemoryAdapter = require('../data/adapters/MemoryAdapter');
    const memoryAdapter = new MemoryAdapter('git-workflow-');
    const dataLayer = new DataLayer(memoryAdapter);
    
    const workflow = await dataLayer.getWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }

    // Initialize services
    const gitService = new GitService();
    const executor = new WorkflowExecutor(gitService, io);

    // Start execution in background
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Send initial response
    res.json({
      success: true,
      data: {
        executionId,
        workflowId: id,
        status: 'started',
        message: 'Workflow execution started'
      }
    });

    // Execute workflow asynchronously
    executor.executeWorkflow(workflow, executionId)
      .then((result) => {
        console.log(`Workflow ${id} execution completed:`, result);
      })
      .catch((error) => {
        console.error(`Workflow ${id} execution failed:`, error);
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
    const io = req.app.get('io');
    
    // Emit stop signal via Socket.IO
    io.emit('execution-stopped', {
      executionId: id,
      timestamp: new Date().toISOString()
    });

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