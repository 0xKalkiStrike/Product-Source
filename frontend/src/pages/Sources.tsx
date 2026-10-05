import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Globe, Plus, Trash2, Cpu } from 'lucide-react';

export interface Source {
  id: string;
  name: string;
  url: string;
  source_type: string;
  auth_required: boolean;
  adapter_name: string;
  max_concurrency: number;
  rate_limit_rpm: number;
  monitoring_interval_min: number;
  status: string;
}

export const SourcesPage: React.FC = () => {
  const { activeProject } = useProject();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState('PUBLIC_SURFACE_WEB');
  const [authRequired, setAuthRequired] = useState(false);
  const [adapterName, setAdapterName] = useState('GenericSourceAdapter');
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [rateLimitRpm, setRateLimitRpm] = useState(60);

  const fetchSources = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${activeProject.id}/sources`);
      setSources(res.data.items || []);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [activeProject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await api.post(`/projects/${activeProject.id}/sources`, {
        name,
        url,
        source_type: sourceType,
        auth_required: authRequired,
        adapter_name: adapterName,
        max_concurrency: maxConcurrency,
        rate_limit_rpm: rateLimitRpm
      });
      setShowModal(false);
      setName('');
      setUrl('');
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create source');
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!activeProject || !confirm('Are you sure you want to remove this source website?')) return;
    try {
      await api.delete(`/projects/${activeProject.id}/sources/${sourceId}`);
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete source');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Authorized Source Websites</h1>
          <p className="page-subtitle">
            Configure target source sites, custom adapters, concurrency limits & rate limits {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Add Source Site</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Source Name</th>
                <th>URL</th>
                <th>Source Type</th>
                <th>Auth Required</th>
                <th>Adapter</th>
                <th>Max Concurrency</th>
                <th>Rate Limit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Loading sources...</td></tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    <Globe size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} /><br />
                    No source websites configured. Click "Add Source Site" to configure your first target website.
                  </td>
                </tr>
              ) : (
                sources.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>
                      <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.source_type}</td>
                    <td>
                      <span className={`badge badge-${s.auth_required ? 'warning' : 'neutral'}`}>
                        {s.auth_required ? 'AUTH REQUIRED' : 'PUBLIC'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      <Cpu size={14} /> {s.adapter_name}
                    </td>
                    <td>{s.max_concurrency} workers</td>
                    <td>{s.rate_limit_rpm} req/min</td>
                    <td>
                      <span className="badge badge-active">{s.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Source Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Configure Source Website</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Source Name *</label>
                <input type="text" className="input" placeholder="e.g. Famous Smoke Shop" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Website URL *</label>
                <input type="url" className="input" placeholder="https://www.famous-smoke.com" value={url} onChange={(e) => setUrl(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Source Type</label>
                <select className="input" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  <option value="PUBLIC_SURFACE_WEB">PUBLIC_SURFACE_WEB</option>
                  <option value="AUTHORIZED_API">AUTHORIZED_API</option>
                  <option value="AUTHORIZED_PORTAL">AUTHORIZED_PORTAL</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Adapter Module</label>
                <select className="input" value={adapterName} onChange={(e) => setAdapterName(e.target.value)}>
                  <option value="GenericSourceAdapter">GenericSourceAdapter</option>
                  <option value="CigarSourceAdapter">CigarSourceAdapter</option>
                  <option value="VapeSourceAdapter">VapeSourceAdapter</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Max Concurrency</label>
                  <input type="number" className="input" value={maxConcurrency} onChange={(e) => setMaxConcurrency(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Limit (Req/Min)</label>
                  <input type="number" className="input" value={rateLimitRpm} onChange={(e) => setRateLimitRpm(Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" id="authReq" checked={authRequired} onChange={(e) => setAuthRequired(e.target.checked)} />
                <label htmlFor="authReq" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Requires Authentication Credential</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Source Website</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
