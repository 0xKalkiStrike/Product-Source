import React, { useState } from 'react';
import { useProject, type Project } from '../context/ProjectContext';
import { api } from '../services/api';
import { Plus, FolderKanban, Check, AlertCircle } from 'lucide-react';

export const Projects: React.FC = () => {
  const { projects, activeProject, setActiveProject, fetchProjects } = useProject();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/projects', { name, description });
      await fetchProjects();
      setActiveProject(res.data);
      setShowModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projId: string, projName: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${projName}"? This will permanently delete all associated products, sources, credentials, and verification data.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${projId}`);
      await fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Isolation Scope</h1>
          <p className="page-subtitle">
            Manage projects to isolate products, sources, credentials, jobs, & audit history.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Active Scope</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No projects found. Click "New Project" to create your first isolated workspace.
                  </td>
                </tr>
              ) : (
                projects.map((proj: Project) => {
                  const isActive = activeProject?.id === proj.id;
                  return (
                    <tr key={proj.id}>
                      <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FolderKanban size={16} color="var(--primary)" />
                        {proj.name}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{proj.description || 'N/A'}</td>
                      <td>
                        <span className="badge badge-active">{proj.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(proj.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {isActive ? (
                          <span className="badge badge-success">
                            <Check size={12} /> Active Scope
                          </span>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.625rem', fontSize: '0.78rem' }}
                            onClick={() => setActiveProject(proj)}
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.625rem', fontSize: '0.78rem', color: '#ef4444' }}
                          onClick={() => handleDelete(proj.id, proj.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Create New Project
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Each project isolates products, sources, credentials, monitoring rules, and screenshots.
            </p>

            {error && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--accent-rose)',
                color: 'var(--accent-rose)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Cigars & Accessories Monitoring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Brief summary of project scope"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
