/**
 * useWorkflows - React hook for workflow management
 * Provides state management and operations for workflows
 */

import { useState, useEffect, useCallback } from 'react';
import { workflowService } from '../services';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allWorkflows = await workflowService.getAllWorkflows();
      setWorkflows(allWorkflows);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const saveWorkflow = useCallback(async (workflowData) => {
    try {
      setError(null);
      const savedWorkflow = await workflowService.saveWorkflow(workflowData);
      setWorkflows(prev => {
        const existingIndex = prev.findIndex(w => w.id === savedWorkflow.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = savedWorkflow;
          return updated;
        } else {
          return [...prev, savedWorkflow];
        }
      });
      return savedWorkflow;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateWorkflow = useCallback(async (id, updates) => {
    try {
      setError(null);
      const updatedWorkflow = await workflowService.updateWorkflow(id, updates);
      setWorkflows(prev => 
        prev.map(w => w.id === id ? updatedWorkflow : w)
      );
      return updatedWorkflow;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteWorkflow = useCallback(async (id) => {
    try {
      setError(null);
      await workflowService.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const duplicateWorkflow = useCallback(async (id, newName) => {
    try {
      setError(null);
      const duplicatedWorkflow = await workflowService.duplicateWorkflow(id, newName);
      setWorkflows(prev => [...prev, duplicatedWorkflow]);
      return duplicatedWorkflow;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const searchWorkflows = useCallback(async (query) => {
    try {
      setError(null);
      return await workflowService.searchWorkflows(query);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const getWorkflow = useCallback(async (id) => {
    try {
      setError(null);
      return await workflowService.getWorkflow(id);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const exportWorkflow = useCallback((id) => {
    try {
      setError(null);
      return workflowService.exportWorkflow(id);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const importWorkflow = useCallback(async (jsonData, newName) => {
    try {
      setError(null);
      const importedWorkflow = await workflowService.importWorkflow(jsonData, newName);
      setWorkflows(prev => [...prev, importedWorkflow]);
      return importedWorkflow;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getStats = useCallback(() => {
    return workflowService.getStats();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workflows,
    loading,
    error,
    loadWorkflows,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    searchWorkflows,
    getWorkflow,
    exportWorkflow,
    importWorkflow,
    getStats,
    clearError
  };
};