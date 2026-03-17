import React, { useState, useEffect } from 'react';
import { Upload, ClipboardList, Clock, Search, X, Copy, Download, Trash2, Play } from 'lucide-react';
import { useWorkflows } from '../hooks/useWorkflows';
import { useNotification } from '../contexts/NotificationContext';
import './WorkflowManager.css';

function WorkflowManager({ onLoadWorkflow, onClose, showOnlyLoad = false }) {
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

  // Filter and sort workflows based on search query
  useEffect(() => {
    let processedWorkflows = [...workflows];
    
    // Sort by updatedAt in descending order (most recently updated first)
    processedWorkflows.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA; // Descending order
    });
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      processedWorkflows = processedWorkflows.filter(workflow =>
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredWorkflows(processedWorkflows);
  }, [workflows, searchQuery]);

  const handleLoadWorkflow = (workflow) => {
    onLoadWorkflow(workflow);
    onClose();
  };

  const handleDeleteWorkflow = async (id) => {
    try {
      await deleteWorkflow(id);
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

  const getDisplayDate = (workflow) => {
    const updatedDate = workflow.updatedAt || workflow.createdAt;
    return formatDate(updatedDate);
  };

  const isMostRecent = (workflow, index) => {
    return index === 0;
  };


  if (loading) {
    return (
      <div className="workflow-manager">
        <div className="workflow-manager-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Gathering your workflows...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-manager">
      <div className="workflow-manager-content">
        <div className="workflow-manager-header">
          <h2>Workflow Manager</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}

        <div className="workflow-manager-body">
          <div className="workflow-actions">
            <div className="search-section">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search your workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {!showOnlyLoad && (
              <div className="import-section">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportWorkflow}
                  id="import-workflow-file"
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  onClick={() => document.getElementById('import-workflow-file').click()}
                  className="import-button"
                >
                  <Upload size={16} /> Import
                </button>
              </div>
            )}
          </div>

          <div className="workflows-list">
            {filteredWorkflows.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={48} className="empty-icon" />
                <h3>No workflows found</h3>
                <p>
                  {searchQuery ? "We couldn't find any workflows matching your search." : "You haven't created any workflows yet."}
                </p>
              </div>
            ) : (
              filteredWorkflows.map((workflow, index) => (
                <div
                  key={workflow.id}
                  className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'selected' : ''}`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="workflow-info">
                    <h3 className="workflow-name">{workflow.name}</h3>
                    <p className="workflow-description">
                      {workflow.description || 'No description provided'}
                    </p>
                    <div className="workflow-meta">
                      <span className="created-date">
                        <Clock size={12} />
                        {getDisplayDate(workflow)}
                        {isMostRecent(workflow, index) && (
                          <span className="label-recent">Current</span>
                        )}
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
                      <Play size={14} style={{ marginRight: '6px' }} /> Load
                    </button>
                    {!showOnlyLoad && (
                      <>
                        <button
                          className="action-button duplicate-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDuplicateDialog(workflow);
                            setDuplicateName(`${workflow.name} (Copy)`);
                          }}
                          title="Duplicate workflow"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="action-button export-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportWorkflow(workflow);
                          }}
                          title="Export workflow"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(workflow.id);
                          }}
                          title="Delete workflow"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Delete Workflow?</h3>
            <p>This will permanently remove the workflow. This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="delete-button-confirm"
                onClick={() => handleDeleteWorkflow(showDeleteConfirm)}
              >
                Delete Workflow
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
            <p>Give your new workflow a name:</p>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="duplicate-name-input"
              placeholder="Workflow name"
              autoFocus
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
                Create Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowManager;