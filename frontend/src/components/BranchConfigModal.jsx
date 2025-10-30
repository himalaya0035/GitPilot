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
  Link 
} from 'lucide-react';

const branchTypeConfigs = {
  production: {
    title: 'Production Branch Configuration',
    icon: <Factory size={20} />,
    description: 'Main production branch'
  },
  feature: {
    title: 'Feature Branch Configuration',
    icon: <Wrench size={20} />,
    description: 'Feature development branch'
  },
  release: {
    title: 'Release Branch Configuration',
    icon: <Rocket size={20} />,
    description: 'Release preparation branch'
  },
  hotfix: {
    title: 'Hotfix Branch Configuration',
    icon: <AlertTriangle size={20} />,
    description: 'Critical bug fix branch'
  },
  develop: {
    title: 'Develop Branch Configuration',
    icon: <Settings size={20} />,
    description: 'Integration branch for features'
  },
  staging: {
    title: 'Staging Branch Configuration',
    icon: <TestTube size={20} />,
    description: 'Pre-production testing environment'
  },
  integration: {
    title: 'Integration Branch Configuration',
    icon: <Link size={20} />,
    description: 'Integration testing and validation branch'
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
      deleteConfig: branch.data.deleteConfig || { enabled: false, remote: false, force: false, remoteName: 'origin' },
      description: branch.data.description || '',
    });
  }, [branch, config]);

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
    const updatedBranch = {
      ...branch,
      data: {
        ...branch.data,
        tags: tagData.tags
      }
    };
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
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="branchName">Branch Name *</label>
              {repositoryPath ? (
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <input
                    type="text"
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) => { handleInputChange('branchName', e.target.value); setShowSuggestions(true); setHighlightIndex(-1); }}
                    onFocus={() => setShowSuggestions(true)}
                    style={{ width: '100%' }}
                    onKeyDown={(e) => {
                      if (!showSuggestions) return;
                      const filtered = branchOptions;
                      const lastIndex = filtered.length - 1;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (lastIndex >= 0) {
                          setHighlightIndex((prev) => {
                            const next = prev < 0 ? 0 : Math.min(prev + 1, lastIndex);
                            return next;
                          });
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (lastIndex >= 0) {
                          setHighlightIndex((prev) => Math.max(prev - 1, 0));
                        }
                      } else if (e.key === 'Enter') {
                        if (highlightIndex >= 0 && filtered[highlightIndex]) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleInputChange('branchName', filtered[highlightIndex].name);
                          setShowSuggestions(false);
                          setHighlightIndex(-1);
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSuggestions(false);
                        setHighlightIndex(-1);
                      }
                    }}
                    placeholder={loadingBranches ? 'Loading branches…' : 'Search branches (local + remote)'}
                    required
                  />
                  {showSuggestions && (formData.branchName || '').length >= 1 && (() => {
                    const filtered = branchOptions;
                    if (filtered.length === 0) return null;
                    return (
                      <div ref={listRef} style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#fff',
                        color: '#111827',
                        borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.25)',
                        padding: 8,
                        marginTop: 8,
                        maxHeight: 220,
                        overflowY: 'auto',
                        boxShadow: '0 10px 30px rgba(99,102,241,0.15), 0 6px 12px rgba(0,0,0,0.06)'
                      }}>
                        {filtered.map((b, idx) => (
                          <div
                            key={`${b.scope}-${b.name}`}
                            onMouseDown={() => { handleInputChange('branchName', b.name); setShowSuggestions(false); setHighlightIndex(-1); }}
                            onMouseEnter={(e) => {
                              setHighlightIndex(idx)
                              e.stopPropagation();
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: highlightIndex === idx ? 'rgba(99,102,241,0.12)' : 'transparent',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 12,
                              background: b.scope === 'remote' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                              color: b.scope === 'remote' ? '#6366f1' : '#10b981'
                            }}>
                              {b.scope}
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <input
                  type="text"
                  id="branchName"
                  value={formData.branchName}
                  onChange={(e) => handleInputChange('branchName', e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g., main, feature/user-auth"
                  required
                />
              )}
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
                  <span className="checkmark"></span>
                  Delete this branch
                </label>
                 <small>Delete this branch after its operations</small>
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
                      <span className="checkmark"></span>
                      Force delete
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
                      <span className="checkmark"></span>
                      Delete remote branch
                    </label>
                    {formData.deleteConfig?.remote && (
                      <div className="inline-input">
                         <input
                           type="text"
                           value={formData.deleteConfig?.remoteName || ''}
                           onChange={(e) => handleInputChange('deleteConfig', { 
                             ...formData.deleteConfig, 
                             remoteName: e.target.value 
                           })}
                           placeholder="origin"
                         />
                        <small>Remote name</small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Tag Management</label>
              <div className="tag-management-section">
                <div className="tag-info">
                  <span className="tag-count">
                    {branch.data.tags?.length || 0} tag{(branch.data.tags?.length || 0) !== 1 ? 's' : ''} configured
                  </span>
                  <small>Manage Git tags for this branch</small>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowTagModal(true)}
                  className="manage-tags-button"
                >
                  🏷️ Manage Tags
                </button>
              </div>
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