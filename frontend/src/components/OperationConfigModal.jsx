import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './OperationConfigModal.css';
import { 
  Clipboard, 
  GitMerge, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Settings 
} from 'lucide-react';

const operationConfigs = {
  checkout: {
    title: 'Checkout Operation',
    icon: <Clipboard size={20} />,
    description: 'Create or switch to a branch',
    fields: [
      { name: 'checkoutType', label: 'Checkout Type', type: 'select', options: [
        { value: 'create', label: 'Create New Branch' },
        { value: 'switch', label: 'Switch to Existing Branch' },
        { value: 'reset', label: 'Reset Branch' },
      ], default: 'create' },
      { name: 'force', label: 'Force Checkout', type: 'checkbox' },
    ],
    getDynamicDescription: (formData) => {
      if (formData.checkoutType === 'create') {
        return 'Create a new branch and switch to it';
      } else if (formData.checkoutType === 'reset') {
        return 'Reset existing branch to source';
      }
      return 'Switch to an existing branch';
    }
  },
  merge: {
    title: 'Merge Operation',
    icon: <GitMerge size={20} />,
    description: 'Merge source branch into target branch',
    fields: [
      { name: 'strategy', label: 'Merge Strategy', type: 'select', options: [
        { value: 'standard', label: 'Standard Merge' },
        { value: 'squash', label: 'Squash Merge' },
      ], default: 'standard' },
      { name: 'ffOption', label: 'Fast Forward Option', type: 'select', options: [
        { value: 'auto', label: 'Auto (Default)' },
        { value: 'no-ff', label: 'No Fast Forward' },
        { value: 'ff-only', label: 'Fast Forward Only' },
      ], conditional: 'standard', default: 'auto' },
      { name: 'commitMessage', label: 'Commit Message', type: 'text', placeholder: 'Optional: commit message for squash merge', conditional: 'squash' },
    ],
    getDynamicDescription: (formData) => {
      if (formData.strategy === 'squash') {
        return 'Squash merge - combine commits into one';
      } else if (formData.strategy === 'standard') {
        if (formData.ffOption === 'no-ff') {
          return 'Standard merge - always create merge commit';
        } else if (formData.ffOption === 'ff-only') {
          return 'Standard merge - fast-forward only';
        }
        return 'Standard merge - auto fast-forward if possible';
      }
      return 'Merge source branch into target branch';
    }
  },
  // rebase: {
  //   title: 'Rebase Operation',
  //   icon: <RotateCcw size={20} />,
  //   description: 'Rebase current branch onto target branch',
  //   fields: [
  //     { name: 'interactive', label: 'Interactive Rebase', type: 'checkbox', default: false },
  //     { name: 'onto', label: 'Rebase Onto', type: 'text', placeholder: 'Optional base branch' },
  //   ]
  // },
  push: {
    title: 'Push Operation',
    icon: <ArrowUp size={20} />,
    description: 'Push branch to remote repository',
    fields: [
      { name: 'remote', label: 'Remote Name', type: 'text', placeholder: 'origin', default: 'origin' },
      { name: 'forceType', label: 'Force Option', type: 'select', options: [
        { value: 'none', label: 'No Force Push' },
        { value: 'force', label: 'Force Push' },
        { value: 'forceWithLease', label: 'Force Push with Lease' },
      ] },
      { name: 'upstream', label: 'Set Upstream', type: 'checkbox' },
    ],
    getDynamicDescription: (formData) => {
      if (formData.forceType === 'forceWithLease') {
        return 'Force push with lease - safer than force push';
      } else if (formData.forceType === 'force') {
        return 'Force push - overwrite remote branch history';
      } else if (formData.upstream) {
        return 'Push and set upstream tracking';
      } else if (formData.remote && formData.remote !== 'origin') {
        return `Push to ${formData.remote} remote`;
      }
      return 'Push branch to remote repository';
    }
  },
  pull: {
    title: 'Pull Operation',
    icon: <ArrowDown size={20} />,
    description: 'Pull changes from remote repository',
    fields: [
      { name: 'remote', label: 'Remote Name', type: 'text', placeholder: 'origin', default: 'origin' },
      { name: 'rebase', label: 'Pull with Rebase', type: 'checkbox', default: false },
    ]
  },
  'delete-branch': {
    title: 'Delete Branch Operation',
    icon: <Trash2 size={20} />,
    description: 'Delete a branch (local or remote)',
    fields: [
      { name: 'remote', label: 'Delete Remote Branch', type: 'checkbox', default: false },
      { name: 'force', label: 'Force Delete', type: 'checkbox', default: false },
    ]
  },
};

function OperationConfigModal({ edge, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const [operationType, setOperationType] = useState(edge.data.operationType || 'merge');
  const config = operationConfigs[operationType];
  const { showWarning } = useNotification();

  useEffect(() => {
    // Initialize form data with existing edge data or defaults
    const initialData = {};
    if (config) {
      config.fields.forEach(field => {
        if (field.name === 'checkoutType' && operationType === 'checkout') {
          // Determine checkoutType from existing parameters
          const params = edge.data.params || {};
          if (params.new) {
            initialData[field.name] = 'create';
          } else if (params.reset) {
            initialData[field.name] = 'reset';
          } else if (params.new === false && params.reset === false) {
            // This is a switch operation
            initialData[field.name] = 'switch';
          } else {
            // No existing parameters, use default
            initialData[field.name] = field.default || 'create';
          }
        } else {
          initialData[field.name] = edge.data.params?.[field.name] || field.default || (field.type === 'checkbox' ? false : '');
        }
      });
    }
    setFormData(initialData);
  }, [edge, config, operationType]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [fieldName]: value
      };
      
      // Clear ffOption when switching to squash
      if (fieldName === 'strategy' && value === 'squash') {
        delete newData.ffOption;
      }
      
      return newData;
    });
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

  const transformFormDataForBackend = (formData, operationType) => {
    if (operationType === 'checkout') {
      // Map new UI structure to backend parameters
      const backendParams = {
        force: formData.force || false
      };
      
      if (formData.checkoutType === 'create') {
        backendParams.new = true;
        backendParams.reset = false;
      } else if (formData.checkoutType === 'reset') {
        backendParams.new = false;
        backendParams.reset = true;
      } else {
        // For 'switch' type, ensure new and reset are false
        backendParams.new = false;
        backendParams.reset = false;
      }
      
      return backendParams;
    }
    
    // For other operations, return formData as-is
    return formData;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (config.fields.some(field => field.required && !formData[field.name])) {
      showWarning('Please fill in all required fields');
      return;
    }
    
    const backendParams = transformFormDataForBackend(formData, operationType);
    
    onSave({
      operationType,
      params: backendParams
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
            <div className="operation-icon">{config?.icon || <Settings size={20} />}</div>
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

            {config && config.fields.map((field) => {
              // Handle conditional logic for different operation types
              let shouldShow = true;
              if (field.conditional) {
                if (operationType === 'merge') {
                  shouldShow = formData.strategy === field.conditional;
                }
                // Checkout no longer has conditional fields
              }
              if (!shouldShow) return null;
              
              return (
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
              );
            })}
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