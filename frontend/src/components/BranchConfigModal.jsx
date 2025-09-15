import React, { useState, useEffect } from 'react';
import './BranchConfigModal.css';

const branchTypeConfigs = {
  production: {
    title: 'Production Branch Configuration',
    icon: '🏭',
    description: 'Main production branch',
    defaultProtection: 'strict'
  },
  feature: {
    title: 'Feature Branch Configuration',
    icon: '🔧',
    description: 'Feature development branch',
    defaultProtection: 'none'
  },
  release: {
    title: 'Release Branch Configuration',
    icon: '🚀',
    description: 'Release preparation branch',
    defaultProtection: 'moderate'
  },
  hotfix: {
    title: 'Hotfix Branch Configuration',
    icon: '🚨',
    description: 'Critical bug fix branch',
    defaultProtection: 'moderate'
  }
};

function BranchConfigModal({ branch, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const config = branchTypeConfigs[branch.data.branchType];

  useEffect(() => {
    // Initialize form data with existing branch data or defaults
    setFormData({
      branchName: branch.data.branchName || '',
      isRemote: branch.data.isRemote || false,
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
    if (!formData.branchName.trim()) {
      alert('Branch name is required');
      return;
    }
    onSave(formData);
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
            <span className="branch-icon">{config.icon}</span>
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
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isRemote}
                  onChange={(e) => handleInputChange('isRemote', e.target.checked)}
                />
                <span className="checkmark"></span>
                Remote Branch
                <small>This branch exists on the remote repository</small>
              </label>
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