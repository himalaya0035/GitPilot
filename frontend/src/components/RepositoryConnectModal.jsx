import React, { useState } from 'react';
import { validateRepo } from '../services/GitApi';
import { Link } from 'lucide-react';
import './BranchConfigModal.css';

function RepositoryConnectModal({ initialPath, onSave, onCancel, showInfo }) {
  const [path, setPath] = useState(initialPath || '');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { ok: boolean, message: string }

  const handleValidateAndSave = async () => {
    const trimmed = path.trim();
    if (!trimmed) {
      setStatus({ ok: false, message: 'Enter a repository path' });
      return;
    }
    try {
      setSubmitting(true);
      const data = await validateRepo(trimmed);
      if (!data.isValid) {
        setStatus({ ok: false, message: 'Not a valid Git repository' });
        return;
      }
      setStatus({ ok: true, message: 'Repository connected' });
      onSave(trimmed);
    } catch (e) {
      setStatus({ ok: false, message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="branch-config-modal" style={{ paddingBottom: 0 }}>
        <div className="modal-header">
          <div className="header-content">
            <div className="branch-icon-for-branch-modal"><Link size={20} /></div>
            <div>
              <h3 style={{ marginBottom: 4 }}>Connect Git Repository</h3>
              {showInfo && (
                <p className="branch-description" style={{ margin: 0 }}>Enable branch suggestions and autocomplete while configuring workflows.</p>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div className="modal-form">
          <div className="form-fields">
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label htmlFor="repoPath">Repository Path</label>
              <input
                id="repoPath"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/your/repo"
              />
            </div>
            {status && (
              <div style={{ marginTop: 2, marginBottom: 4, color: status.ok ? '#16a34a' : '#dc2626' }}>
                {status.message}
              </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0, marginTop: 4 }}>
              <div className="action-buttons" style={{ gap: 0 }}>
                <button type="button" onClick={handleValidateAndSave} className="save-button" disabled={submitting}>
                  {submitting ? 'Validating…' : 'Validate & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepositoryConnectModal;


