import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './OperationConfigModal.css';
import { 
  Clipboard, 
  GitMerge, 
  ArrowUp, 
  ArrowDown, 
  Trash2,
  Settings,
  X,
  Check,
  ChevronDown
} from 'lucide-react';

const operationConfigs = {
  checkout: {
    title: 'Checkout Branch',
    icon: <Clipboard size={22} />,
    description: 'Switch between existing branches or create new ones',
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
    title: 'Merge Branches',
    icon: <GitMerge size={22} />,
    description: 'Integrate changes from the source into the target branch',
    fields: [
      { name: 'strategy', label: 'Merge Method', type: 'select', options: [
        { value: 'standard', label: 'Standard (Create Merge Commit)' },
        { value: 'squash', label: 'Squash (Combine to Single Commit)' },
      ], default: 'standard' },
      { name: 'ffOption', label: 'Fast-Forward Behavior', type: 'select', options: [
        { value: 'auto', label: 'Allow Fast-Forward (Default)' },
        { value: 'no-ff', label: 'Disable Fast-Forward (--no-ff)' },
        { value: 'ff-only', label: 'Fast Forward Only' },
      ], conditional: 'standard', default: 'auto' },
      { name: 'commitMessage', label: 'Squash Message', type: 'text', placeholder: 'Enter commit message...', conditional: 'squash' },
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
  push: {
    title: 'Push to Remote',
    icon: <ArrowUp size={22} />,
    description: 'Synchronize local changes with the remote repository',
    fields: [
      { name: 'remote', label: 'Remote Target', type: 'text', placeholder: 'origin', default: 'origin' },
      { name: 'forceType', label: 'Safety Level', type: 'select', options: [
        { value: 'none', label: 'Standard Push' },
        { value: 'forceWithLease', label: 'Force with Lease' },
        { value: 'force', label: 'Force Overwrite (Dangerous)' },
      ] },
      { name: 'upstream', label: 'Set Upstream tracking (-u)', type: 'checkbox' },
    ],
    getDynamicDescription: (formData) => {
      if (formData.forceType === 'force') return 'Caution: This can overwrite colleague\'s work';
      if (formData.upstream) return 'Establishes persistent tracking between local and remote';
      return `Pushing changes to '${formData.remote || 'origin'}'`;
    }
  },
  pull: {
    title: 'Pull from Remote',
    icon: <ArrowDown size={22} />,
    description: 'Download and integrate remote changes',
    fields: [
      { name: 'remote', label: 'Remote Source', type: 'text', placeholder: 'origin', default: 'origin' },
      { name: 'rebase', label: 'Use Rebase integration', type: 'checkbox', default: false },
    ],
    getDynamicDescription: (formData) => {
      if (formData.rebase) return 'Keeps a cleaner history by rebasing local commits';
      return `Fetching and merging from '${formData.remote || 'origin'}'`;
    }
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
          const params = edge.data.params || {};
          if (params.new) initialData[field.name] = 'create';
          else if (params.reset) initialData[field.name] = 'reset';
          else if (params.new === false && params.reset === false) initialData[field.name] = 'switch';
          else initialData[field.name] = field.default || 'create';
        } else {
          initialData[field.name] = edge.data.params?.[field.name] || field.default || (field.type === 'checkbox' ? false : '');
        }
      });
    }
    setFormData(initialData);
  }, [edge, operationType]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      if (fieldName === 'strategy' && value === 'squash') delete newData.ffOption;
      return newData;
    });
  };

  const handleOperationTypeChange = (newType) => {
    setOperationType(newType);
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
      const backendParams = { force: formData.force || false };
      if (formData.checkoutType === 'create') {
        backendParams.new = true;
        backendParams.reset = false;
      } else if (formData.checkoutType === 'reset') {
        backendParams.new = false;
        backendParams.reset = true;
      } else {
        backendParams.new = false;
        backendParams.reset = false;
      }
      return backendParams;
    }
    return formData;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (config.fields.some(field => field.required && !formData[field.name])) {
      showWarning('Please fill in all required fields');
      return;
    }
    const backendParams = transformFormDataForBackend(formData, operationType);
    onSave({ operationType, params: backendParams });
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
      case 'select':
        return (
          <div className="select-wrapper" style={{ position: 'relative' }}>
            <select
              value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required}
              style={{ width: '100%', appearance: 'none' }}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
          </div>
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
            <div className="operation-icon">{config?.icon || <Settings size={22} />}</div>
            <div>
              <h3>{config?.title || 'Operation Configuration'}</h3>
              <p className="operation-description">
                {config?.getDynamicDescription ? config.getDynamicDescription(formData) : (config?.description || 'Configure Git operation parameters')}
              </p>
            </div>
          </div>
          <button className="close-button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="operationType">Operation Type <span className="required">*</span></label>
              <div className="select-wrapper" style={{ position: 'relative' }}>
                <select
                  id="operationType"
                  value={operationType}
                  onChange={(e) => handleOperationTypeChange(e.target.value)}
                  style={{ width: '100%', appearance: 'none' }}
                >
                  {Object.keys(operationConfigs).map((type) => (
                    <option key={type} value={type}>
                      {operationConfigs[type].title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
              </div>
            </div>

            {config && config.fields.map((field) => {
              let shouldShow = !field.conditional || formData.strategy === field.conditional;
              if (!shouldShow) return null;
              
              return (
                <div key={field.name} className="form-group">
                  {field.type !== 'checkbox' && (
                    <label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                  )}
                  {renderField(field)}
                </div>
              );
            })}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onDelete} className="delete-button" title="Remove operation">
              <Trash2 size={16} /> Delete Operation
            </button>
            <div className="action-buttons">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                <Check size={18} /> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OperationConfigModal;