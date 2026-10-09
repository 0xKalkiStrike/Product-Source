import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, ensureArray } from '../services/api';
import { Globe, Plus, Trash2, Cpu, Settings2, RefreshCw, Play, CheckCircle2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  last_successful_execution?: string;
}

export const SourcesPage: React.FC = () => {
  const { activeProject } = useProject();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
  const [scrapeNotice, setScrapeNotice] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editSource, setEditSource] = useState<Source | null>(null);

  // Simple Add Source Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [autoScrapeOnAdd, setAutoScrapeOnAdd] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced Form Overrides
  const [sourceType, setSourceType] = useState('PUBLIC_SURFACE_WEB');
  const [authRequired, setAuthRequired] = useState(false);
  const [adapterName, setAdapterName] = useState('GenericSourceAdapter');
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [rateLimitRpm, setRateLimitRpm] = useState(60);

  const fetchSources = async () => {
    if (!activeProject) {
      setLoading(false);
      setSources([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/projects/${activeProject.id}/sources`);
      setSources(ensureArray<Source>(res.data));
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [activeProject]);

  const handleSeed = async () => {
    if (!activeProject) return;
    setSeeding(true);
    try {
      const res = await api.post(`/projects/${activeProject.id}/sources/seed`);
      setSources(ensureArray<Source>(res.data));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to seed target sources');
    } finally {
      setSeeding(false);
    }
  };

  const handleScrapeSource = async (source: Source) => {
    if (!activeProject) return;
    setScrapingSourceId(source.id);
    setScrapeNotice(null);
    try {
      const res = await api.post(`/projects/${activeProject.id}/sources/${source.id}/scrape`);
      const msg = res.data.message || `Successfully scraped products from ${source.name}`;
      setScrapeNotice(msg);
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Scraping failed for this source site');
    } finally {
      setScrapingSourceId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    // Auto-detect best adapter if not manually tweaked
    let selectedAdapter = adapterName;
    const combinedStr = (name + ' ' + url).toLowerCase();
    if (adapterName === 'GenericSourceAdapter') {
      if (combinedStr.includes('vape') || combinedStr.includes('vapor')) {
        selectedAdapter = 'VapeSourceAdapter';
      } else if (combinedStr.includes('cigar') || combinedStr.includes('smoke')) {
        selectedAdapter = 'CigarSourceAdapter';
      }
    }

    try {
      const createRes = await api.post(`/projects/${activeProject.id}/sources`, {
        name,
        url,
        source_type: sourceType,
        auth_required: authRequired,
        adapter_name: selectedAdapter,
        max_concurrency: maxConcurrency,
        rate_limit_rpm: rateLimitRpm
      });

      const newSource = createRes.data;
      setShowModal(false);
      setName('');
      setUrl('');
      setShowAdvanced(false);

      if (autoScrapeOnAdd && newSource?.id) {
        setScrapeNotice(`Source '${name}' added! Web scraper is now gathering whole product catalog...`);
        handleScrapeSource(newSource);
      } else {
        fetchSources();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create target source site');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editSource) return;
    try {
      await api.patch(`/projects/${activeProject.id}/sources/${editSource.id}`, {
        name: editSource.name,
        url: editSource.url,
        source_type: editSource.source_type,
        auth_required: editSource.auth_required,
        adapter_name: editSource.adapter_name,
        max_concurrency: editSource.max_concurrency,
        rate_limit_rpm: editSource.rate_limit_rpm,
        status: editSource.status
      });
      setEditSource(null);
      fetchSources();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update target source');
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
            Configure target source sites, set URL & Name to scrape product catalogs {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>
            <RefreshCw size={16} className={seeding ? 'spin' : ''} />
            <span>Fetch Target Sources</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Add Source Site</span>
          </button>
        </div>
      </div>

      {/* Live Web Scraper Notification Alert */}
      {scrapeNotice && (
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-green)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', fontWeight: 600 }}>
            <CheckCircle2 size={20} />
            <span>{scrapeNotice}</span>
          </div>
          <Link to="/products" className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
            <Layers size={14} /> View Products Catalog
          </Link>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '1.5rem', minWidth: '170px' }}>SOURCE NAME</th>
                <th style={{ minWidth: '220px' }}>WEBSITE URL</th>
                <th style={{ minWidth: '160px' }}>ADAPTER ENGINE</th>
                <th>STATUS</th>
                <th style={{ minWidth: '130px' }}>LAST EXECUTION</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem', minWidth: '160px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading target sources...</td></tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    <Globe size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} /><br />
                    No target source websites configured. Click "Add Source Site" to enter Name & URL to scrape products.
                  </td>
                </tr>
              ) : (
                sources.map((s) => {
                  const cleanDisplayUrl = s.url ? s.url.replace(/(https?:\/\/[^\/]+)\/https?:\/\/.*/, '$1') : s.url;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)', paddingLeft: '1.5rem', minWidth: '170px' }}>{s.name}</td>
                      <td style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={cleanDisplayUrl} target="_blank" rel="noreferrer" title={cleanDisplayUrl}>
                          {cleanDisplayUrl}
                        </a>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.82rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Cpu size={14} /> {s.adapter_name}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-active">{s.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {s.last_successful_execution ? new Date(s.last_successful_execution).toLocaleTimeString() : 'Never'}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => handleScrapeSource(s)}
                            disabled={scrapingSourceId === s.id}
                            title="Scrape product catalog from this website"
                          >
                            <Play size={13} className={scrapingSourceId === s.id ? 'spin' : ''} />
                            <span>{scrapingSourceId === s.id ? 'Scraping Site...' : 'Scrape Products'}</span>
                          </button>

                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => setEditSource(s)}
                            title="Configure adapter and rate limits"
                          >
                            <Settings2 size={13} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}
                            onClick={() => handleDelete(s.id)}
                            title="Delete target source"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simplified Add Source Modal: Require Only Name & URL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <Globe size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Configure New Source Website
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Provide Name & Website URL to scrape product data
                </span>
              </div>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Source Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Element Vape"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Website URL *</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://elementvape.com/"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>

              {/* Checkbox: Auto-scrape products right after save */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: '#0b0f19',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem'
              }}>
                <input
                  type="checkbox"
                  id="autoScrape"
                  checked={autoScrapeOnAdd}
                  onChange={(e) => setAutoScrapeOnAdd(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="autoScrape" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500 }}>
                  Automatically scrape whole product data from site after saving
                </label>
              </div>

              {/* Collapsible Advanced Settings */}
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: 0
                  }}
                >
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{showAdvanced ? 'Hide Advanced Settings' : 'Advanced Engine Settings (Optional)'}</span>
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: '#0b0f19', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Source Type</label>
                      <select className="input" style={{ fontSize: '0.82rem' }} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                        <option value="PUBLIC_SURFACE_WEB">PUBLIC_SURFACE_WEB</option>
                        <option value="AUTHORIZED_API">AUTHORIZED_API</option>
                        <option value="AUTHORIZED_PORTAL">AUTHORIZED_PORTAL</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Adapter Module</label>
                      <select className="input" style={{ fontSize: '0.82rem' }} value={adapterName} onChange={(e) => setAdapterName(e.target.value)}>
                        <option value="GenericSourceAdapter">GenericSourceAdapter</option>
                        <option value="CigarSourceAdapter">CigarSourceAdapter</option>
                        <option value="VapeSourceAdapter">VapeSourceAdapter</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="checkbox"
                        id="addAuthReq"
                        checked={authRequired}
                        onChange={(e) => setAuthRequired(e.target.checked)}
                      />
                      <label htmlFor="addAuthReq" style={{ fontSize: '0.78rem', cursor: 'pointer' }}>Requires Authentication Credential</label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Max Concurrency</label>
                        <input type="number" className="input" style={{ fontSize: '0.82rem' }} value={maxConcurrency} onChange={(e) => setMaxConcurrency(Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate Limit (Req/Min)</label>
                        <input type="number" className="input" style={{ fontSize: '0.82rem' }} value={rateLimitRpm} onChange={(e) => setRateLimitRpm(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Play size={15} /> Save & Scrape Products
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Configure Target Source Modal */}
      {editSource && (
        <div className="modal-overlay" onClick={() => setEditSource(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Configure Adapter & Limits: {editSource.name}
            </h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Source Name *</label>
                <input
                  type="text"
                  className="input"
                  value={editSource.name}
                  onChange={(e) => setEditSource({ ...editSource, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Website URL *</label>
                <input
                  type="url"
                  className="input"
                  value={editSource.url}
                  onChange={(e) => setEditSource({ ...editSource, url: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adapter Module</label>
                <select
                  className="input"
                  value={editSource.adapter_name}
                  onChange={(e) => setEditSource({ ...editSource, adapter_name: e.target.value })}
                >
                  <option value="GenericSourceAdapter">GenericSourceAdapter</option>
                  <option value="CigarSourceAdapter">CigarSourceAdapter</option>
                  <option value="VapeSourceAdapter">VapeSourceAdapter</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Max Worker Concurrency</label>
                  <input
                    type="number"
                    className="input"
                    value={editSource.max_concurrency}
                    onChange={(e) => setEditSource({ ...editSource, max_concurrency: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Limit (RPM)</label>
                  <input
                    type="number"
                    className="input"
                    value={editSource.rate_limit_rpm}
                    onChange={(e) => setEditSource({ ...editSource, rate_limit_rpm: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="editAuthReq"
                  checked={editSource.auth_required}
                  onChange={(e) => setEditSource({ ...editSource, auth_required: e.target.checked })}
                />
                <label htmlFor="editAuthReq" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Requires Credentials</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditSource(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

