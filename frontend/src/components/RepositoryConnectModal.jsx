import React, { useState, useEffect } from 'react';
import { validateRepo } from '../services/GitApi';
import { isPlayground } from '../services';
import { Link, X, CheckCircle, AlertCircle, Loader2, Clock, Trash2, FlaskConical } from 'lucide-react';
import './RepositoryConnectModal.css';

function RepositoryConnectModal({ initialPath, onSave, onCancel, showInfo }) {
  const [path, setPath] = useState(initialPath || '');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { ok: boolean, message: string }
  const [savedRepositories, setSavedRepositories] = useState([]);

  // Load saved repositories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gitPilotSavedRepositories');
    if (saved) {
      try {
        setSavedRepositories(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved repositories:', error);
        setSavedRepositories([]);
      }
    }
  }, []);

  // In playground mode, auto-connect the demo repo
  useEffect(() => {
    if (isPlayground) {
      onSave('/playground/demo-repo');
    }
  }, [isPlayground]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToHistory = (repoPath) => {
    const repoName = repoPath.split(/[\/\\]/).pop() || 'Unknown Repository';
    const newRepo = {
      id: Date.now().toString(),
      name: repoName,
      path: repoPath,
      lastUsed: new Date().toISOString()
    };

    const updated = [newRepo, ...savedRepositories.filter(r => r.path !== repoPath)].slice(0, 5);
    setSavedRepositories(updated);
    localStorage.setItem('gitPilotSavedRepositories', JSON.stringify(updated));
  };

  const removeRepository = (e, id) => {
    e.stopPropagation();
    const updated = savedRepositories.filter(repo => repo.id !== id);
    setSavedRepositories(updated);
    localStorage.setItem('gitPilotSavedRepositories', JSON.stringify(updated));
  };

  const handleValidateAndSave = async (selectedPath = path) => {
    const trimmed = selectedPath.trim();
    if (!trimmed) {
      setStatus({ ok: false, message: 'Please enter a repository path' });
      return;
    }
    try {
      setSubmitting(true);
      setStatus(null);
      const data = await validateRepo(trimmed);
      if (!data.isValid) {
        setStatus({ ok: false, message: 'This is not a valid Git repository' });
        return;
      }

      saveToHistory(trimmed);
      setStatus({ ok: true, message: 'Repository successfully connected' });

      // Delay to show success state briefly
      setTimeout(() => {
        onSave(trimmed);
      }, 500);
    } catch (e) {
      setStatus({ ok: false, message: e.message || 'Validation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // Playground mode: render nothing (auto-connected above)
  if (isPlayground) return null;

  return (
    <div className="modal-overlay">
      <div className="repo-connect-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="repo-icon"><Link size={20} /></div>
            <div>
              <h3>Connect Repository</h3>
              {showInfo && (
                <p className="modal-description">Select a local Git repository to begin.</p>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          {savedRepositories.length > 0 && (
            <div className="recent-repos-section">
              <label className="section-label">
                <Clock size={14} /> Recently Used
              </label>
              <div className="recent-repos-list">
                {savedRepositories.map(repo => (
                  <div
                    key={repo.id}
                    className="recent-repo-item"
                    onClick={() => {
                      setPath(repo.path);
                      handleValidateAndSave(repo.path);
                    }}
                  >
                    <div className="repo-details">
                      <span className="repo-name">{repo.name}</span>
                      <span className="repo-path">{repo.path}</span>
                    </div>
                    <button
                      className="remove-recent"
                      onClick={(e) => removeRepository(e, repo.id)}
                      title="Remove from history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="repoPath" className="section-label">Local Repository Path</label>
            <div className="input-with-icon">
              <input
                id="repoPath"
                type="text"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value);
                  if (status) setStatus(null);
                }}
                placeholder="e.g., /home/user/projects/my-repo"
                onKeyDown={(e) => e.key === 'Enter' && handleValidateAndSave()}
                autoFocus
              />
            </div>
          </div>

          {status && (
            <div className={`status-message ${status.ok ? 'status-success' : 'status-error'}`}>
              {status.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleValidateAndSave()}
            className="save-button"
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Validating...</>
            ) : (
              'Connect Repository'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RepositoryConnectModal;
