import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useLanguage, SUPPORTED_LOCALES } from '../../context/LanguageContext';
import { FolderKanban, LogOut, Shield, HeartPulse, Globe, Plus, X, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProject, createProject } = useProject();
  const { currentLocale, setLocale } = useLanguage();

  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createProject(projName.trim(), projDesc.trim());
      setShowNewProjModal(false);
      setProjName('');
      setProjDesc('');
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Could not create the project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Clean raw user name if it has parenthetical text like "Deep (System Admin)"
  const cleanName = (user?.full_name || 'Admin').replace(/\s*\([^)]*\)/g, '').trim();
  const userRole = user?.role || 'ADMIN';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={onMenuClick} aria-label="Open navigation" title="Menu">
            <Menu size={18} />
          </button>

          <div className="topbar-group">
            <FolderKanban size={18} color="var(--primary)" aria-hidden="true" />
            <label htmlFor="project-select" className="topbar-label">Project</label>
            <select
              id="project-select"
              value={activeProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="input topbar-select-project"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.84rem' }}
            >
              {projects.length === 0 ? (
                <option value="">No projects yet</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <button
              className="btn btn-secondary"
              onClick={() => setShowNewProjModal(true)}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              title="Create a new project"
            >
              <Plus size={14} color="var(--primary)" />
              <span>New project</span>
            </button>
          </div>

          <div className="topbar-group">
            <Globe size={16} color="var(--accent-cyan)" aria-hidden="true" />
            <label htmlFor="locale-select" className="sr-only">Locale and currency</label>
            <select
              id="locale-select"
              value={currentLocale.code}
              onChange={(e) => setLocale(e.target.value)}
              className="input topbar-select-locale"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="topbar-right">
          <span className="engine-pill">
            <HeartPulse size={14} aria-hidden="true" />
            Engine online
          </span>

          <div className="user-chip">
            <div className="user-avatar" aria-hidden="true">{cleanName.charAt(0) || 'A'}</div>
            <div className="user-chip-text">
              <div className="user-chip-name" title={cleanName}>{cleanName}</div>
              <div className="user-chip-role">
                <Shield size={10} aria-hidden="true" /> {userRole}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
            title="Sign out"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {showNewProjModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderKanban size={20} color="var(--primary)" aria-hidden="true" />
                <h3 id="new-project-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>New project</h3>
              </div>
              <button
                onClick={() => setShowNewProjModal(false)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-project-name">Project name *</label>
                <input
                  id="new-project-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Gotham Electronics Catalog"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-project-desc">Description (optional)</label>
                <textarea
                  id="new-project-desc"
                  className="input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe the market scope"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                />
              </div>

              {createError && (
                <p role="alert" style={{ color: 'var(--accent-rose)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
                  {createError}
                </p>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewProjModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating || !projName.trim()}>
                  {creating ? 'Creating...' : 'Create and switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
