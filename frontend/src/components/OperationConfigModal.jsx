import React, { useState, useEffect } from 'react';
import './OperationConfigModal.css';

const operationConfigs = {
  checkout: {
    title: 'Checkout Operation',
    icon: '📋',
    description: 'Create or switch to a branch',
    fields: [
      { name: 'new', label: 'Create New Branch', type: 'checkbox', default: true },
      { name: 'force', label: 'Force Checkout', type: 'checkbox', default: false },
    ],
    getDynamicDescription: (formData) => {
      if (formData.new) {
        return 'Create a new branch and switch to it';
      }
      return 'Switch to an existing branch';
    }
  },
  merge: {
    title: 'Merge Operation',
    icon: '🔀',
    description: 'Merge source branch into target branch',
    fields: [
      { name: 'strategy', label: 'Merge Strategy', type: 'select', options: [
        { value: 'merge', label: 'Standard Merge' },
        { value: 'squash', label: 'Squash Merge' },
        { value: 'fast-forward', label: 'Fast Forward' },
      ], default: 'merge' },
      { name: 'noFF', label: 'No Fast Forward', type: 'checkbox', default: false },
    ]
  },
  rebase: {
    title: 'Rebase Operation',
    icon: '🔄',
    description: 'Rebase current branch onto target branch',
    fields: [
      { name: 'interactive', label: 'Interactive Rebase', type: 'checkbox', default: false },
      { name: 'onto', label: 'Rebase Onto', type: 'text', placeholder: 'Optional base branch' },
    ]
  },
  push: {
    title: 'Push Operation',
    icon: '⬆️',
    description: 'Push branch to remote repository',
    fields: [
      { name: 'force', label: 'Force Push', type: 'checkbox', default: false },
      { name: 'upstream', label: 'Set Upstream', type: 'checkbox', default: true },
      { name: 'remote', label: 'Remote Name', type: 'text', placeholder: 'origin', default: 'origin' },
    ]
  },
  pull: {
    title: 'Pull Operation',
    icon: '⬇️',
    description: 'Pull changes from remote repository',
    fields: [
      { name: 'rebase', label: 'Pull with Rebase', type: 'checkbox', default: false },
      { name: 'remote', label: 'Remote Name', type: 'text', placeholder: 'origin', default: 'origin' },
    ]
  },
  'delete-branch': {
    title: 'Delete Branch Operation',
    icon: '🗑️',
    description: 'Delete a branch (local or remote)',
    fields: [
      { name: 'remote', label: 'Delete Remote Branch', type: 'checkbox', default: false },
      { name: 'force', label: 'Force Delete', type: 'checkbox', default: false },
    ]
  },
  tag: {
    title: 'Tag Operation',
    icon: '🏷️',
    description: 'Create and push a Git tag',
    fields: [
      { name: 'tagName', label: 'Tag Name', type: 'text', placeholder: 'v1.0.0', required: true },
      { name: 'message', label: 'Tag Message', type: 'text', placeholder: 'Release version 1.0.0' },
      { name: 'push', label: 'Push Tag to Remote', type: 'checkbox', default: true },
    ]
  },
};

function OperationConfigModal({ edge, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const [operationType, setOperationType] = useState(edge.data.operationType || 'merge');
  const config = operationConfigs[operationType];

  useEffect(() => {
    // Initialize form data with existing edge data or defaults
    const initialData = {};
    if (config) {
      config.fields.forEach(field => {
        initialData[field.name] = edge.data.params?.[field.name] || field.default || (field.type === 'checkbox' ? false : '');
      });
    }
    setFormData(initialData);
  }, [edge, config, operationType]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleOperationTypeChange = (newType) => {
    setOperationType(newType);
    // Reset form data for new operation type
    const newConfig = operationConfigs[newType];
    const newData = {};
    if (newConfig) {
      newConfig.fields.forEach(field => {
        newData[field.name] = field.default || (field.type === 'checkbox' ? false : '');
      });
    }
    setFormData(newData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (config.fields.some(field => field.required && !formData[field.name])) {
      alert('Please fill in all required fields');
      return;
    }
    onSave({
      operationType,
      params: formData
    });
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'checkbox':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData[field.name] || false}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
            />
            <span className="checkmark"></span>
            {field.label}
          </label>
        );
      case 'select':
        return (
          <select
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'text':
      default:
        return (
          <input
            type="text"
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="operation-config-modal">
        <div className="modal-header">
          <div className="header-content">
            <span className="operation-icon">{config?.icon || '⚙️'}</span>
            <div>
              <h3>{config?.title || 'Operation Configuration'}</h3>
              <p className="operation-description">
                {config?.getDynamicDescription ? config.getDynamicDescription(formData) : (config?.description || 'Configure Git operation')}
              </p>
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="operationType">Operation Type</label>
              <select
                id="operationType"
                value={operationType}
                onChange={(e) => handleOperationTypeChange(e.target.value)}
              >
                {Object.keys(operationConfigs).map((type) => (
                  <option key={type} value={type}>
                    {operationConfigs[type].title}
                  </option>
                ))}
              </select>
            </div>

            {config && config.fields.map((field) => (
              <div key={field.name} className="form-group">
                {field.type === 'checkbox' ? (
                  renderField(field)
                ) : (
                  <>
                    <label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                    {renderField(field)}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onDelete} className="delete-button">
              Delete Operation
            </button>
            <div className="action-buttons">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save Operation
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OperationConfigModal;