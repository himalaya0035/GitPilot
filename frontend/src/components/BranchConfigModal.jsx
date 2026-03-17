import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { validateBranchName, sanitizeBranchName } from '../utils/validation';
import TagManagementModal from './TagManagementModal';
import './BranchConfigModal.css';
import { getBranches } from '../services/GitApi';
import {
  Factory,
  Wrench,
  Rocket,
  AlertTriangle,
  Settings,
  TestTube,
  Link,
  Tag,
  Trash2,
  X,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';

const branchTypeConfigs = {
  production: {
    title: 'Production Branch',
    icon: <Factory size={24} />,
    description: 'Main production branch for stable releases'
  },
  feature: {
    title: 'Feature Branch',
    icon: <Wrench size={24} />,
    description: 'Developing new features and enhancements'
  },
  release: {
    title: 'Release Branch',
    icon: <Rocket size={24} />,
    description: 'Final preparation for production release'
  },
  hotfix: {
    title: 'Hotfix Branch',
    icon: <AlertTriangle size={24} />,
    description: 'Urgent fixes for critical production issues'
  },
  develop: {
    title: 'Develop Branch',
    icon: <Settings size={24} />,
    description: 'Main integration branch for development'
  },
  staging: {
    title: 'Staging Branch',
    icon: <TestTube size={24} />,
    description: 'Environment for pre-production quality assurance'
  },
  integration: {
    title: 'Integration Branch',
    icon: <Link size={24} />,
    description: 'Merging and testing multiple feature branches'
  }
};

function BranchConfigModal({ branch, repositoryPath, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState({});
  const [showTagModal, setShowTagModal] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const config = branchTypeConfigs[branch.data.branchType] || branchTypeConfigs.feature;
  const { showWarning } = useNotification();

  useEffect(() => {
    // Initialize form data with existing branch data or defaults
    setFormData({
      branchName: branch.data.branchName || '',
      autoPull: branch.data.autoPull || false,
      autoPullRemote: branch.data.autoPullRemote || 'origin',
      autoPush: branch.data.autoPush || false,
      autoPushRemote: branch.data.autoPushRemote || 'origin',
      deleteConfig: branch.data.deleteConfig || { enabled: false, remote: false, force: false, remoteName: 'origin' },
      description: branch.data.description || '',
    });
  }, [branch]);

  // Debounced server-side search
  useEffect(() => {
    if (!repositoryPath) return;
    const handle = setTimeout(async () => {
      try {
        setLoadingBranches(true);
        const list = await getBranches(repositoryPath, formData.branchName || '', 20, true);
        setBranchOptions(list);
      } catch (e) {
        console.error('Failed to fetch branches', e);
      } finally {
        setLoadingBranches(false);
      }
    }, 100);
    return () => clearTimeout(handle);
  }, [repositoryPath, formData.branchName]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Keep highlighted item in view when navigating with keyboard
  useEffect(() => {
    if (!listRef.current || highlightIndex < 0) return;
    const children = listRef.current.children;
    if (!children || !children[highlightIndex]) return;
    const el = children[highlightIndex];
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [highlightIndex]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle tag modal
  const handleTagSave = (tagData) => {
    onSave({
      ...formData,
      tags: tagData.tags
    });
    setShowTagModal(false);
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
          <button className="close-button" onClick={onCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="branchName">Branch Target *</label>
              {repositoryPath ? (
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <input
                    type="text"
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) => { handleInputChange('branchName', e.target.value); setShowSuggestions(true); setHighlightIndex(-1); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="branch-name-input"
                    style={{ width: '100%' }}
                    onKeyDown={(e) => {
                      if (!showSuggestions) return;
                      const filtered = branchOptions;
                      const lastIndex = filtered.length - 1;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (lastIndex >= 0) {
                          setHighlightIndex((prev) => (prev < lastIndex ? prev + 1 : prev));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (lastIndex >= 0) {
                          setHighlightIndex((prev) => Math.max(prev - 1, 0));
                        }
                      } else if (e.key === 'Enter') {
                        if (highlightIndex >= 0 && filtered[highlightIndex]) {
                          e.preventDefault();
                          handleInputChange('branchName', filtered[highlightIndex].name);
                          setShowSuggestions(false);
                          setHighlightIndex(-1);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                        setHighlightIndex(-1);
                      }
                    }}
                    placeholder={loadingBranches ? 'Discovering branches...' : 'Type to search branches...'}
                    required
                  />
                  {showSuggestions && branchOptions.length > 0 && (
                    <div ref={listRef} className="suggestions-dropdown">
                      {branchOptions.map((b, idx) => (
                        <div
                          key={`${b.scope}-${b.name}`}
                          className={`suggestion-item ${highlightIndex === idx ? 'highlighted' : ''}`}
                          onMouseDown={() => { handleInputChange('branchName', b.name); setShowSuggestions(false); setHighlightIndex(-1); }}
                          onMouseEnter={() => setHighlightIndex(idx)}
                        >
                          <span className={`suggestion-badge badge-${b.scope}`}>
                            {b.scope}
                          </span>
                          <span className="suggestion-name">{b.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  id="branchName"
                  value={formData.branchName}
                  onChange={(e) => handleInputChange('branchName', e.target.value)}
                  placeholder="e.g., main, feature/auth"
                  required
                />
              )}
            </div>

            <div className="form-group">
              <div className="checkbox-with-input">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.autoPull}
                    onChange={(e) => handleInputChange('autoPull', e.target.checked)}
                  />
                  <div>
                    Pull Latest from Remote
                    <small>Sync this branch with the remote repository before running any operations</small>
                  </div>
                </label>
                {formData.autoPull && (
                  <div className="inline-input">
                    <small>Remote Name</small>
                    <input
                      type="text"
                      value={formData.autoPullRemote}
                      onChange={(e) => handleInputChange('autoPullRemote', e.target.value)}
                      placeholder="origin"
                    />
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
                  <div>
                    Push Results to Remote
                    <small>Auto-upload changes to the remote branch after successful operations</small>
                  </div>
                </label>
                {formData.autoPush && (
                  <div className="inline-input">
                    <small>Remote Name</small>
                    <input
                      type="text"
                      value={formData.autoPushRemote}
                      onChange={(e) => handleInputChange('autoPushRemote', e.target.value)}
                      placeholder="origin"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-with-input">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.deleteConfig?.enabled || false}
                    onChange={(e) => handleInputChange('deleteConfig', { 
                      ...formData.deleteConfig, 
                      enabled: e.target.checked 
                    })}
                  />
                  <div>
                    Ephemeral Branch (Automated Cleanup)
                    <small>Mark this branch for deletion after the workflow successfully completes</small>
                  </div>
                </label>
                {formData.deleteConfig?.enabled && (
                  <div className="delete-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.deleteConfig?.force || false}
                        onChange={(e) => handleInputChange('deleteConfig', { 
                          ...formData.deleteConfig, 
                          force: e.target.checked 
                        })}
                      />
                      <div>Force Delete <small>Bypass Git safety checks</small></div>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.deleteConfig?.remote || false}
                        onChange={(e) => handleInputChange('deleteConfig', { 
                          ...formData.deleteConfig, 
                          remote: e.target.checked 
                        })}
                      />
                      <div>Clear Remote <small>Also delete from the remote repository</small></div>
                    </label>
                    {formData.deleteConfig?.remote && (
                      <div className="inline-input">
                         <small>Remote</small>
                         <input
                           type="text"
                           value={formData.deleteConfig?.remoteName || ''}
                           onChange={(e) => handleInputChange('deleteConfig', { 
                             ...formData.deleteConfig, 
                             remoteName: e.target.value 
                           })}
                           placeholder="origin"
                         />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Git Tags</label>
              <div className="tag-management-section">
                <div className="tag-info">
                  <span className="tag-count">
                    {branch.data.tags?.length || 0} tag{(branch.data.tags?.length || 0) !== 1 ? 's' : ''} defined
                  </span>
                  <small>Tags help mark specific points in your workflow</small>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowTagModal(true)}
                  className="manage-tags-button"
                >
                  <Tag size={16} /> Update Tags
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onDelete} className="delete-button" title="Remove node from workflow">
              <Trash2 size={16} /> Delete Node
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

      {showTagModal && (
        <TagManagementModal
          branch={branch}
          onSave={handleTagSave}
          onCancel={() => setShowTagModal(false)}
        />
      )}
    </div>
  );
}

export default BranchConfigModal;