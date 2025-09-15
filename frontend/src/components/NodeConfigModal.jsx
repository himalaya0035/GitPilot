import React, { useState, useEffect } from 'react';
import './NodeConfigModal.css';

const nodeTypeConfigs = {
  checkout: {
    title: 'Checkout Configuration',
    fields: [
      { name: 'new', label: 'Create New Branch', type: 'checkbox' },
      { name: 'from', label: 'From Branch', type: 'text', placeholder: 'e.g., main' },
      { name: 'to', label: 'To Branch', type: 'text', placeholder: 'e.g., feature-branch' },
    ]
  },
  merge: {
    title: 'Merge Configuration',
    fields: [
      { name: 'source', label: 'Source Branch', type: 'text', placeholder: 'e.g., feature-branch' },
      { name: 'target', label: 'Target Branch', type: 'text', placeholder: 'e.g., main' },
    ]
  },
  rebase: {
    title: 'Rebase Configuration',
    fields: [
      { name: 'branch', label: 'Branch to Rebase', type: 'text', placeholder: 'e.g., feature-branch' },
    ]
  },
  push: {
    title: 'Push Configuration',
    fields: [
      { name: 'force', label: 'Force Push', type: 'checkbox' },
    ]
  },
  pull: {
    title: 'Pull Configuration',
    fields: [
      { name: 'rebase', label: 'Pull with Rebase', type: 'checkbox' },
    ]
  },
  'delete-branch': {
    title: 'Delete Branch Configuration',
    fields: [
      { name: 'branch', label: 'Branch to Delete', type: 'text', placeholder: 'e.g., feature-branch' },
    ]
  },
  tag: {
    title: 'Tag Configuration',
    fields: [
      { name: 'tagName', label: 'Tag Name', type: 'text', placeholder: 'e.g., v1.0.0' },
    ]
  },
};

function NodeConfigModal({ node, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const config = nodeTypeConfigs[node.type];

  useEffect(() => {
    // Initialize form data with existing node data or defaults
    const initialData = {};
    config.fields.forEach(field => {
      initialData[field.name] = node.data.params?.[field.name] || (field.type === 'checkbox' ? false : '');
    });
    setFormData(initialData);
  }, [node, config]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ params: formData });
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
            {field.label}
          </label>
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
      <div className="node-config-modal">
        <div className="modal-header">
          <h3>{config.title}</h3>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            {config.fields.map((field) => (
              <div key={field.name} className="form-group">
                {field.type === 'checkbox' ? (
                  renderField(field)
                ) : (
                  <>
                    <label htmlFor={field.name}>{field.label}</label>
                    {renderField(field)}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onDelete} className="delete-button">
              Delete Node
            </button>
            <div className="action-buttons">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NodeConfigModal;