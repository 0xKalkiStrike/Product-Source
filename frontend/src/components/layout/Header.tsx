import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useLanguage, SUPPORTED_LOCALES } from '../../context/LanguageContext';
import { FolderKanban, LogOut, Shield, HeartPulse, Globe, Plus, X, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProject, createProject } = useProject();
  const { currentLocale, setLocale } = useLanguage();

  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    setCreating(true);
    try {
      await createProject(projName.trim(), projDesc.trim());
      setShowNewProjModal(false);
      setProjName('');
      setProjDesc('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const cleanName = (user?.full_name || 'Admin').replace(/\s*\([^)]*\)/g, '').trim();
  const userRole = user?.role || 'ADMIN';

  return (
    <>
      <header className="topbar">
        {/* Left Section */}
        <div className="topbar-left">
          {onMenuClick && (
            <button
              className="icon-btn"
              onClick={onMenuClick}
              title="Toggle Navigation Menu"
              type="button"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Project Switcher */}
          <div className="topbar-group">
            <FolderKanban size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Project:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="input topbar-select-project"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
            >
              {projects.length === 0 ? (
                <option value="">No Projects Found</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowNewProjModal(true)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
              title="Create new project scope"
            >
              <Plus size={14} color="var(--primary)" />
              <span>New</span>
            </button>
          </div>

          {/* Locale Switcher */}
          <div className="topbar-group">
            <Globe size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <select
              value={currentLocale.code}
              onChange={(e) => setLocale(e.target.value)}
              className="input topbar-select-locale"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Section */}
        <div className="topbar-right">
          {/* Health status badge */}
          <div className="engine-pill">
            <HeartPulse size={14} />
            <span>Engine Online</span>
          </div>

          {/* User Profile */}
          <div className="user-chip">
            <div className="user-avatar">
              {cleanName.charAt(0) || 'A'}
            </div>
            <div className="user-chip-text">
              <div className="user-chip-name">{cleanName}</div>
              <div className="user-chip-role">
                <Shield size={10} /> {userRole}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
            title="Sign out"
            type="button"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* New Project Modal */}
      {showNewProjModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderKanban size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Create Project Scope</h3>
              </div>
              <button onClick={() => setShowNewProjModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
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
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Target market scope details..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewProjModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating || !projName.trim()}>
                  {creating ? 'Creating...' : 'Create & Switch Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
