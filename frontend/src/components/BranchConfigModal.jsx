import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { validateBranchName, sanitizeBranchName } from '../utils/validation';
import './BranchConfigModal.css';
import { 
  Factory, 
  Wrench, 
  Rocket, 
  AlertTriangle, 
  Settings, 
  TestTube, 
  Link 
} from 'lucide-react';

const branchTypeConfigs = {
  production: {
    title: 'Production Branch Configuration',
    icon: <Factory size={20} />,
    description: 'Main production branch',
    defaultProtection: 'strict'
  },
  feature: {
    title: 'Feature Branch Configuration',
    icon: <Wrench size={20} />,
    description: 'Feature development branch',
    defaultProtection: 'none'
  },
  release: {
    title: 'Release Branch Configuration',
    icon: <Rocket size={20} />,
    description: 'Release preparation branch',
    defaultProtection: 'moderate'
  },
  hotfix: {
    title: 'Hotfix Branch Configuration',
    icon: <AlertTriangle size={20} />,
    description: 'Critical bug fix branch',
    defaultProtection: 'moderate'
  },
  develop: {
    title: 'Develop Branch Configuration',
    icon: <Settings size={20} />,
    description: 'Integration branch for features',
    defaultProtection: 'moderate'
  },
  staging: {
    title: 'Staging Branch Configuration',
    icon: <TestTube size={20} />,
    description: 'Pre-production testing environment',
    defaultProtection: 'moderate'
  },
  integration: {
    title: 'Integration Branch Configuration',
    icon: <Link size={20} />,
    description: 'Integration testing and validation branch',
    defaultProtection: 'moderate'
  }
};

function BranchConfigModal({ branch, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const config = branchTypeConfigs[branch.data.branchType];
  const { showWarning } = useNotification();

  useEffect(() => {
    // Initialize form data with existing branch data or defaults
    setFormData({
      branchName: branch.data.branchName || '',
      autoPull: branch.data.autoPull || false,
      autoPullRemote: branch.data.autoPullRemote || 'origin',
      autoPush: branch.data.autoPush || false,
      autoPushRemote: branch.data.autoPushRemote || 'origin',
      protection: branch.data.protection || config.defaultProtection,
      description: branch.data.description || '',
    });
  }, [branch, config]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameValidation = validateBranchName(formData.branchName);
    if (!nameValidation.isValid) {
      showWarning(nameValidation.error);
      return;
    }
    
    // Sanitize the branch name before saving
    const sanitizedData = {
      ...formData,
      branchName: sanitizeBranchName(formData.branchName)
    };
    
    onSave(sanitizedData);
  };

  const protectionOptions = [
    { value: 'none', label: 'No Protection', description: 'No restrictions' },
    { value: 'moderate', label: 'Moderate Protection', description: 'Require PR reviews' },
    { value: 'strict', label: 'Strict Protection', description: 'Require PR reviews + status checks' },
  ];

  return (
    <div className="modal-overlay">
      <div className="branch-config-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="branch-icon-for-branch-modal">{config.icon}</div>
            <div>
              <h3>{config.title}</h3>
              <p className="branch-description">{config.description}</p>
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="branchName">Branch Name *</label>
              <input
                type="text"
                id="branchName"
                value={formData.branchName}
                onChange={(e) => handleInputChange('branchName', e.target.value)}
                placeholder="e.g., main, feature/user-auth"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description of this branch's purpose"
                rows="1"
              />
            </div>


            <div className="form-group">
              <div className="checkbox-with-input">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.autoPull}
                    onChange={(e) => handleInputChange('autoPull', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Pull latest changes from remote
                </label>
                <small>Automatically create pull operation for this branch</small>
                {formData.autoPull && (
                  <div className="inline-input">
                    <input
                      type="text"
                      value={formData.autoPullRemote}
                      onChange={(e) => handleInputChange('autoPullRemote', e.target.value)}
                      placeholder="origin"
                    />
                    <small>Pull remote</small>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-with-input">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.autoPush}
                    onChange={(e) => handleInputChange('autoPush', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Push latest changes to remote
                </label>
                <small>Automatically create push operation for this branch</small>
                {formData.autoPush && (
                  <div className="inline-input">
                    <input
                      type="text"
                      value={formData.autoPushRemote}
                      onChange={(e) => handleInputChange('autoPushRemote', e.target.value)}
                      placeholder="origin"
                    />
                    <small>Push remote</small>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="protection">Branch Protection</label>
              <select
                id="protection"
                value={formData.protection}
                onChange={(e) => handleInputChange('protection', e.target.value)}
              >
                {protectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onDelete} className="delete-button">
              Delete Branch
            </button>
            <div className="action-buttons">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save Branch
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BranchConfigModal;