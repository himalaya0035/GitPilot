import React, { useState, useEffect } from 'react';
import { useWorkflows } from '../hooks/useWorkflows';
import { useNotification } from '../contexts/NotificationContext';
import './WorkflowManager.css';

function WorkflowManager({ onLoadWorkflow, onClose }) {
  const {
    workflows,
    loading,
    error,
    deleteWorkflow,
    duplicateWorkflow,
    exportWorkflow,
    importWorkflow,
    clearError
  } = useWorkflows();
  const { showError } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Filter workflows based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = workflows.filter(workflow =>
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredWorkflows(filtered);
    } else {
      setFilteredWorkflows(workflows);
    }
  }, [workflows, searchQuery]);

  const handleLoadWorkflow = (workflow) => {
    onLoadWorkflow(workflow);
    onClose();
  };

  const handleDeleteWorkflow = async (workflowId) => {
    try {
      await deleteWorkflow(workflowId);
      setShowDeleteConfirm(null);
      setSelectedWorkflow(null);
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const handleDuplicateWorkflow = async (workflow) => {
    try {
      const newName = duplicateName || `${workflow.name} (Copy)`;
      await duplicateWorkflow(workflow.id, newName);
      setShowDuplicateDialog(null);
      setDuplicateName('');
    } catch (err) {
      console.error('Failed to duplicate workflow:', err);
    }
  };

  const handleExportWorkflow = (workflow) => {
    try {
      const jsonData = exportWorkflow(workflow.id);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export workflow:', err);
    }
  };

  const handleImportWorkflow = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target.result;
        await importWorkflow(jsonData);
        // Reset file input
        event.target.value = '';
      } catch (err) {
        console.error('Failed to import workflow:', err);
        showError('Failed to import workflow. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className="workflow-manager">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-manager">
      <div className="workflow-manager-header">
        <h2>Workflow Manager</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <div className="workflow-manager-content">
        <div className="workflow-actions">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="import-section">
            <input
              type="file"
              accept=".json"
              onChange={handleImportWorkflow}
              id="import-workflow-file"
              style={{ display: 'none' }}
            />
            <label htmlFor="import-workflow-file" className="import-button">
              📁 Import Workflow
            </label>
          </div>
        </div>

        <div className="workflows-list">
          {filteredWorkflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No workflows found</h3>
              <p>
                {searchQuery ? 'No workflows match your search.' : 'Create your first workflow to get started.'}
              </p>
            </div>
          ) : (
            filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'selected' : ''}`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="workflow-info">
                  <h3 className="workflow-name">{workflow.name}</h3>
                  <p className="workflow-description">
                    {workflow.description || 'No description'}
                  </p>
                  <div className="workflow-meta">
                    <span className="branch-count">
                      {workflow.branches?.length || 0} branches
                    </span>
                    <span className="operation-count">
                      {workflow.operations?.length || 0} operations
                    </span>
                    <span className="created-date">
                      {formatDate(workflow.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="workflow-actions">
                  <button
                    className="action-button load-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadWorkflow(workflow);
                    }}
                    title="Load workflow"
                  >
                    📂
                  </button>
                  <button
                    className="action-button duplicate-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDuplicateDialog(workflow);
                      setDuplicateName(`${workflow.name} (Copy)`);
                    }}
                    title="Duplicate workflow"
                  >
                    📋
                  </button>
                  <button
                    className="action-button export-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportWorkflow(workflow);
                    }}
                    title="Export workflow"
                  >
                    💾
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(workflow.id);
                    }}
                    title="Delete workflow"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Delete Workflow</h3>
            <p>Are you sure you want to delete this workflow? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="delete-button"
                onClick={() => handleDeleteWorkflow(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Dialog */}
      {showDuplicateDialog && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Duplicate Workflow</h3>
            <p>Enter a name for the duplicated workflow:</p>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="duplicate-name-input"
              placeholder="Workflow name"
            />
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowDuplicateDialog(null);
                  setDuplicateName('');
                }}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={() => handleDuplicateWorkflow(showDuplicateDialog)}
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowManager;