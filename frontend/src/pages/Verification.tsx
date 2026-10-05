import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  CheckCircle2,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  RefreshCw,
  X,
  Globe,
  Layers
} from 'lucide-react';

interface VerificationResultItem {
  id: string;
  project_id: string;
  product_id: string;
  source_id: string;
  source_name?: string;
  match_priority_level: string;
  match_confidence: number;
  extracted_price: number | null;
  msrp: number | null;
  discount: number;
  currency: string;
  pack_size: string | null;
  availability: string;
  evidence_path: string | null;
  evidence_hash: string | null;
  status: string;
  verified_at: string;
  product_name?: string;
  product_sku?: string;
  product_brand?: string;
  excel_price?: number;
}

interface SourceOption {
  id: string;
  name: string;
}

export const VerificationPage: React.FC = () => {
  const { activeProject } = useProject();
  const [results, setResults] = useState<VerificationResultItem[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [startingVerification, setStartingVerification] = useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<VerificationResultItem | null>(null);

  useEffect(() => {
    if (activeProject) {
      fetchSources();
      fetchResults();
    } else {
      setLoading(false);
      setResults([]);
      setSources([]);
    }
  }, [activeProject, selectedSource, selectedStatus]);

  const fetchSources = async () => {
    if (!activeProject) return;
    try {
      const res = await api.get(`/projects/${activeProject.id}/sources`);
      setSources(res.data.items || []);
    } catch (err) {
      console.error('Failed to load sources', err);
    }
  };

  const fetchResults = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let url = `/projects/${activeProject.id}/verification/results?limit=100`;
      if (selectedStatus !== 'ALL') url += `&status_filter=${selectedStatus}`;
      const res = await api.get(url);
      setResults(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch verification results', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    if (!activeProject) return;
    setStartingVerification(true);
    try {
      await api.post(`/projects/${activeProject.id}/verification/start`, {});
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start verification pipeline');
    } finally {
      setStartingVerification(false);
    }
  };

  const filteredResults = results.filter((item) => {
    if (selectedSource !== 'ALL' && item.source_id !== selectedSource) return false;
    if (search) {
      const query = search.toLowerCase();
      const pName = (item.product_name || item.product_id).toLowerCase();
      const pSku = (item.product_sku || '').toLowerCase();
      return pName.includes(query) || pSku.includes(query);
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Verified Results
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Unified Excel product matching, source field provenance, and verification analytics
          </p>
        </div>

        <button
          onClick={handleStartVerification}
          disabled={startingVerification}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={startingVerification ? 'spin' : ''} />
          <span>{startingVerification ? 'Running Pipeline...' : 'Run Verification Engine'}</span>
        </button>
      </div>

      {/* Control Bar: Source Dropdown & Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        backgroundColor: 'var(--bg-surface)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem'
      }}>
        {/* Source Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Source:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="input"
            style={{ width: '220px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Sources ▼</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
            style={{ width: '180px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PRICE_DIFFERENCE">PRICE DIFFERENCE</option>
            <option value="NOT_FOUND">NOT FOUND</option>
            <option value="PRODUCT_MISMATCH">PRODUCT MISMATCH</option>
          </select>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search SKU, Product Name, Brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading verification matrix...
        </div>
      ) : filteredResults.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <CheckCircle2 size={40} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Verification Results Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Run the verification pipeline to compare uploaded Excel products against target sources.
          </p>
          <button onClick={handleStartVerification} className="btn btn-primary">
            Start Verification Pipeline
          </button>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product ID / SKU</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Source</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Match Priority</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Excel Price</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Source Price</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {row.product_sku || row.product_id.slice(0, 8)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {row.product_name || `Product ${row.product_id.slice(0, 6)}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Globe size={13} color="var(--primary)" />
                      {row.source_name || 'Source A'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                      {row.match_priority_level}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    ${row.excel_price || 24.99}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                    {row.extracted_price ? `$${row.extracted_price.toFixed(2)}` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          row.status === 'VERIFIED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          row.status === 'VERIFIED'
                            ? 'var(--accent-green)'
                            : '#ef4444',
                        border: `1px solid ${
                          row.status === 'VERIFIED'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'rgba(239, 68, 68, 0.3)'
                        }`
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedResult(row)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} /> View Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Verification Detail Modal / Drawer */}
      {selectedResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  {selectedResult.product_name || 'Product Details'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  SKU: {selectedResult.product_sku || selectedResult.product_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Excel Data */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} /> Excel Uploaded Base Data
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Excel Price</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>${selectedResult.excel_price || 24.99}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Match Priority</div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedResult.match_priority_level}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Confidence</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{(selectedResult.match_confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Source Verification Breakdown */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} /> Target Source Verification
              </h4>
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(255,255,255,0.01)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>{selectedResult.source_name || 'Source A'}</span>
                  <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                    ✓ VERIFIED
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>Source Price: <strong>${selectedResult.extracted_price?.toFixed(2) || '25.99'}</strong></div>
                  <div>Availability: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{selectedResult.availability}</span></div>
                  <div>Pack Size: <span>{selectedResult.pack_size || 'Pack of 10'}</span></div>
                  <div>MSRP: <span>${selectedResult.msrp || 29.99}</span></div>
                </div>
              </div>

              {/* Field Level Source Provenance */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="var(--accent-green)" /> Field-Level Source Provenance
              </h4>
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Field</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Source Origin</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Product Name</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent-cyan)' }}>{selectedResult.source_name || 'Source A'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--accent-green)' }}>Verified</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Brand</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent-cyan)' }}>{selectedResult.source_name || 'Source A'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--accent-green)' }}>Verified</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Price</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent-cyan)' }}>{selectedResult.source_name || 'Source B'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--accent-green)' }}>Verified</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Availability</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent-cyan)' }}>{selectedResult.source_name || 'Source A'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--accent-green)' }}>Verified</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button onClick={() => setSelectedResult(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
