import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { KeyRound, Plus, ShieldCheck, RefreshCw } from 'lucide-react';

export interface SourceCredential {
  id: string;
  name: string;
  auth_type: string;
  source_id?: string;
  masked_data: Record<string, string>;
  status: string;
  last_validated_at?: string;
  validation_error?: string;
  created_at: string;
}

export interface SourceItem {
  id: string;
  name: string;
}

export const CredentialsPage: React.FC = () => {
  const { activeProject } = useProject();
  const [credentials, setCredentials] = useState<SourceCredential[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [authType, setAuthType] = useState('API_KEY');
  const [keyName1, setKeyName1] = useState('api_key');
  const [keyValue1, setKeyValue1] = useState('');

  const fetchCredentialsData = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const [credRes, srcRes] = await Promise.all([
        api.get(`/projects/${activeProject.id}/credentials`),
        api.get(`/projects/${activeProject.id}/sources`)
      ]);
      setCredentials(credRes.data || []);
      setSources(srcRes.data.items || []);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentialsData();
  }, [activeProject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await api.post(`/projects/${activeProject.id}/credentials`, {
        name,
        source_id: sourceId || undefined,
        auth_type: authType,
        credential_data: { [keyName1]: keyValue1 }
      });
      setShowModal(false);
      setName('');
      setKeyValue1('');
      fetchCredentialsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add credential');
    }
  };

  const handleValidate = async (credId: string) => {
    if (!activeProject) return;
    setValidatingId(credId);
    try {
      await api.post(`/projects/${activeProject.id}/credentials/${credId}/validate`);
      await fetchCredentialsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Validation failed');
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Encrypted Credential Vault</h1>
          <p className="page-subtitle">
            Source credential mapping, AES-GCM Fernet encryption, RBAC & status validation {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Add Credential</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Credential Name</th>
                <th>Auth Type</th>
                <th>Source Website</th>
                <th>Masked Secret Payload</th>
                <th>Status</th>
                <th>Last Validated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading credentials...</td></tr>
              ) : credentials.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    <KeyRound size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} /><br />
                    No source credentials stored. Click "Add Credential" to configure authorization credentials.
                  </td>
                </tr>
              ) : (
                credentials.map((c) => {
                  const mappedSource = sources.find(s => s.id === c.source_id);
                  const isValidating = validatingId === c.id;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={16} color="var(--primary)" />
                        {c.name}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.auth_type}</td>
                      <td style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                        {mappedSource ? mappedSource.name : 'Unmapped (Global)'}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', backgroundColor: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          {JSON.stringify(c.masked_data)}
                        </code>
                      </td>
                      <td>
                        <span className={`badge badge-${c.status === 'VALID' ? 'success' : c.status === 'INVALID' ? 'danger' : 'neutral'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {c.last_validated_at ? new Date(c.last_validated_at).toLocaleString() : 'Never'}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.625rem', fontSize: '0.78rem' }}
                          onClick={() => handleValidate(c.id)}
                          disabled={isValidating}
                        >
                          <RefreshCw size={12} className={isValidating ? 'spin' : ''} />
                          <span>{isValidating ? 'Testing...' : 'Test / Validate'}</span>
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

      {/* Add Credential Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Encrypted Credential</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Credential Name *</label>
                <input type="text" className="input" placeholder="e.g. Partner Store API Key" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Assign to Source Website</label>
                <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  <option value="">None (Global Credential)</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Authentication Type</label>
                <select className="input" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                  <option value="API_KEY">API Key</option>
                  <option value="BEARER_TOKEN">Bearer Token</option>
                  <option value="BASIC">Basic Auth (Username / Password)</option>
                  <option value="SESSION_COOKIE">Session Cookie</option>
                  <option value="CUSTOM_HEADER">Custom Header</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Key Name</label>
                  <input type="text" className="input" value={keyName1} onChange={(e) => setKeyName1(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Secret Value *</label>
                  <input type="password" className="input" placeholder="Encrypted payload value" value={keyValue1} onChange={(e) => setKeyValue1(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Encrypt & Save Credential</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
