/**
 * Workflow routes - CRUD operations for workflows
 * Compatible with frontend WorkflowService interface
 */

const express = require('express');
const router = express.Router();
const DataLayer = require('../data/DataLayer');
const MemoryAdapter = require('../data/adapters/MemoryAdapter');
const { validateWorkflow, validateWorkflowId } = require('../middleware/validation');

// Initialize data layer with memory adapter
const memoryAdapter = new MemoryAdapter('git-workflow-');
const dataLayer = new DataLayer(memoryAdapter);

/**
 * GET /api/workflows
 * Get all workflows
 */
router.get('/', async (req, res, next) => {
  try {
    const workflows = await dataLayer.getAllWorkflows();
    res.json({
      success: true,
      data: workflows,
      count: workflows.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflows/:id
 * Get a specific workflow by ID
 */
router.get('/:id', validateWorkflowId, async (req, res, next) => {
  try {
    const workflow = await dataLayer.getWorkflow(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', validateWorkflow, async (req, res, next) => {
  try {
    const workflow = await dataLayer.saveWorkflow(req.body);
    
    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workflows/:id
 * Update an existing workflow
 */
router.put('/:id', validateWorkflowId, validateWorkflow, async (req, res, next) => {
  try {
    const workflow = await dataLayer.updateWorkflow(req.params.id, req.body);
    
    res.json({
      success: true,
      data: workflow,
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete('/:id', validateWorkflowId, async (req, res, next) => {
  try {
    await dataLayer.deleteWorkflow(req.params.id);
    
    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }
    next(error);
  }
});

/**
 * GET /api/workflows/search?q=query
 * Search workflows by name or description
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query is required' }
      });
    }

    const workflows = await dataLayer.searchWorkflows(q);
    
    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
      query: q
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflows/type/:branchType
 * Get workflows by branch type
 */
router.get('/type/:branchType', async (req, res, next) => {
  try {
    const { branchType } = req.params;
    const workflows = await dataLayer.getWorkflowsByBranchType(branchType);
    
    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
      branchType
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflows/:id/duplicate
 * Duplicate a workflow
 */
router.post('/:id/duplicate', validateWorkflowId, async (req, res, next) => {
  try {
    const { newName } = req.body;
    const duplicatedWorkflow = await dataLayer.duplicateWorkflow(req.params.id, newName);
    
    res.status(201).json({
      success: true,
      data: duplicatedWorkflow,
      message: 'Workflow duplicated successfully'
    });
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }
    next(error);
  }
});

/**
 * GET /api/workflows/:id/export
 * Export workflow as JSON
 */
router.get('/:id/export', validateWorkflowId, async (req, res, next) => {
  try {
    const jsonData = dataLayer.exportWorkflow(req.params.id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="workflow-${req.params.id}.json"`);
    res.send(jsonData);
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Workflow not found' }
      });
    }
    next(error);
  }
});

/**
 * POST /api/workflows/import
 * Import workflow from JSON
 */
router.post('/import', async (req, res, next) => {
  try {
    const { jsonData, newName } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({
        success: false,
        error: { message: 'JSON data is required' }
      });
    }

    const importedWorkflow = await dataLayer.importWorkflow(jsonData, newName);
    
    res.status(201).json({
      success: true,
      data: importedWorkflow,
      message: 'Workflow imported successfully'
    });
  } catch (error) {
    if (error.message === 'Invalid workflow format') {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid workflow format' }
      });
    }
    next(error);
  }
});

/**
 * GET /api/workflows/stats
 * Get workflow statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await dataLayer.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;