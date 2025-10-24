import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import './TagManagementModal.css';

function TagManagementModal({ branch, onSave, onCancel }) {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    setTags(branch.data.tags || []);
  }, [branch]);

  // Add tag
  const addTag = () => {
    setTags([...tags, {
      id: `tag-${Date.now()}`,
      action: 'create',
      tagName: '',
      message: '',
      pushToRemote: false,
      forceCreate: false,
      deleteRemote: false,
      remote: 'origin'
    }]);
  };

  // Update tag
  const updateTag = (tagId, field, value) => {
    setTags(tags.map(tag => 
      tag.id === tagId ? { ...tag, [field]: value } : tag
    ));
  };

  // Delete tag
  const deleteTag = (tagId) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out tags with empty names
    const validTags = tags.filter(tag => tag.tagName.trim() !== '');
    
    onSave({ tags: validTags });
  };

  return (
    <div className="modal-overlay">
      <div className="tag-management-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="tag-icon">🏷️</div>
            <div>
              <h3>Tag Management</h3>
              <p className="branch-info">Manage Git tags for <strong>{branch.data.branchName}</strong></p>
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="tags-container">
            {tags.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏷️</div>
                <p>No tags configured for this branch</p>
                <small>Add tags to mark important commits or releases</small>
              </div>
            ) : (
              tags.map((tag, index) => (
                <div key={tag.id} className="tag-card">
                  <div className="tag-header">
                    <span className="tag-number">#{index + 1}</span>
                    <div className="tag-actions">
                      <button 
                        type="button" 
                        onClick={addTag} 
                        className="add-tag-button-small"
                        title="Add new tag"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => deleteTag(tag.id)} 
                        className="delete-tag-button"
                        title="Remove tag"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="tag-fields">
                    <div className="field-group">
                      <label>Action</label>
                      <select 
                        value={tag.action} 
                        onChange={(e) => updateTag(tag.id, 'action', e.target.value)}
                        className="action-select"
                      >
                        <option value="create">Create Tag</option>
                        <option value="push">Push Tag</option>
                        <option value="delete">Delete Tag</option>
                      </select>
                    </div>
                    
                    <div className="field-group">
                      <label>Tag Name</label>
                      <div className="tag-name-input-container">
                        <input 
                          type="text" 
                          value={tag.tagName}
                          onChange={(e) => updateTag(tag.id, 'tagName', e.target.value)}
                          placeholder="v1.0.0"
                          maxLength={40}
                          className="tag-name-input"
                        />
                        <small className="char-counter">{tag.tagName.length}/40</small>
                      </div>
                    </div>
                    
                    {tag.action === 'create' && (
                      <>
                        <div className="field-group">
                          <label>Message (Optional)</label>
                          <input 
                            type="text"
                            value={tag.message}
                            onChange={(e) => updateTag(tag.id, 'message', e.target.value)}
                            placeholder="Release version 1.0.0"
                            className="message-input"
                          />
                        </div>
                        
                        <div className="checkbox-group">
                          <label className="checkbox-label">
                            <input 
                              type="checkbox"
                              checked={tag.pushToRemote}
                              onChange={(e) => updateTag(tag.id, 'pushToRemote', e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Push to remote after creation
                          </label>
                        </div>
                        
                        <div className="checkbox-group">
                          <label className="checkbox-label">
                            <input 
                              type="checkbox"
                              checked={tag.forceCreate}
                              onChange={(e) => updateTag(tag.id, 'forceCreate', e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Force create (overwrite if exists)
                          </label>
                        </div>
                      </>
                    )}
                    
                    {tag.action === 'push' && (
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            checked={tag.forceCreate}
                            onChange={(e) => updateTag(tag.id, 'forceCreate', e.target.checked)}
                          />
                          <span className="checkmark"></span>
                          Force push to remote
                        </label>
                      </div>
                    )}
                    
                    {tag.action === 'delete' && (
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            checked={tag.deleteRemote}
                            onChange={(e) => updateTag(tag.id, 'deleteRemote', e.target.checked)}
                          />
                          <span className="checkmark"></span>
                          Delete from remote as well
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          

          {tags.length > 0 && (
            <div className="modal-actions">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save Tags
              </button>
            </div>
          )}
          
          {tags.length === 0 && (
            <div className="add-tag-section">
              <button type="button" onClick={addTag} className="add-tag-button">
                <Plus size={16} />
                Add Tag
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default TagManagementModal;
