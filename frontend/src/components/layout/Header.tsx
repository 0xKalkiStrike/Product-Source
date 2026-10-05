import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { useLanguage, SUPPORTED_LOCALES } from '../../context/LanguageContext';
import { FolderKanban, LogOut, Shield, HeartPulse, Globe } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProject } = useProject();
  const { currentLocale, setLocale } = useLanguage();

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 9
    }}>
      {/* Left Project Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderKanban size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Project:</span>
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const found = projects.find(p => p.id === e.target.value);
              if (found) setActiveProject(found);
            }}
            className="input"
            style={{
              width: '210px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem'
            }}
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
        </div>

        {/* International Language / Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} color="var(--accent-cyan)" />
          <select
            value={currentLocale.code}
            onChange={(e) => setLocale(e.target.value)}
            className="input"
            style={{
              width: '210px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.82rem'
            }}
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right User & Telemetry Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Health status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--accent-green)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <HeartPulse size={14} />
          <span>Engine Online</span>
        </div>

        {/* User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Shield size={10} /> {user?.role || 'ADMIN'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          title="Sign out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
