import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Layers } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  phase: number;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, phase, description }) => {
  const { activeProject } = useProject();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">
            {description} {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <span className="badge badge-neutral" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          Target Phase {phase}
        </span>
      </div>

      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '1rem'
        }}>
          <Layers size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {title} Module Ready for Phase {phase}
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
          Phase 1 Foundation setup complete. This module is scoped and registered to expand in Phase {phase} according to master specifications.
        </p>
      </div>
    </div>
  );
};
