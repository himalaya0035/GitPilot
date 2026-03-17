/**
 * Execution History Routes
 * GET  /api/executions              — list all (or filter by ?workflowId=)
 * GET  /api/executions/:executionId — full record with logs + operations
 * DELETE /api/executions/:executionId
 */

const express = require('express');
const router = express.Router();
const executionDataLayer = require('../data/sharedExecutionDataLayer');

// GET /api/executions  (optional ?workflowId=)
router.get('/', async (req, res) => {
  try {
    const { workflowId } = req.query;
    let data;
    if (workflowId) {
      data = await executionDataLayer.getExecutionsByWorkflow(workflowId);
    } else {
      data = await executionDataLayer.getAllExecutions();
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/executions/:executionId
router.get('/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const data = await executionDataLayer.getExecution(executionId);
    if (!data) {
      return res.status(404).json({ success: false, error: { message: 'Execution not found' } });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/executions/:executionId
router.delete('/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const deleted = await executionDataLayer.deleteExecution(executionId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Execution not found' } });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
