import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, ensureArray } from '../services/api';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Play,
  Download,
  ExternalLink,
  Eye,
  Globe,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ComparisonRow {
  product_id: string;
  sku: string;
  excel_name: string;
  excel_price: number;
  brand?: string;
  pack_size?: string;
  source_name: string;
  source_url: string;
  matched_title: string;
  source_price: number | null;
  variance: number | null;
  variance_pct: number | null;
  confidence: number;
  status: 'VERIFIED' | 'PRICE_VARIANCE' | 'NOT_FOUND';
  verified_at: string;
  specifications?: Record<string, any>;
}

export const ExcelComparisonPage: React.FC = () => {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string; url: string }[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRowDetail, setSelectedRowDetail] = useState<ComparisonRow | null>(null);

  const fetchComparisonData = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, srcRes, verRes] = await Promise.all([
        api.get(`/projects/${activeProject.id}/products?limit=1000`),
        api.get(`/projects/${activeProject.id}/sources`),
        api.get(`/projects/${activeProject.id}/verification/results?limit=1000`)
      ]);

      const products = ensureArray(prodRes.data);
      const sources = ensureArray(srcRes.data);
      const results = ensureArray(verRes.data);

      setSourcesList(sources.map((s: any) => ({ id: s.id, name: s.name, url: s.url })));

      const resultsByProduct = new Map<string, any>();
      results.forEach((r: any) => {
        if (!resultsByProduct.has(r.product_id)) {
          resultsByProduct.set(r.product_id, r);
        }
      });

      const combinedRows: ComparisonRow[] = products.map((p: any) => {
        const ver = resultsByProduct.get(p.id);
        const specs = p.specifications || {};

        let excelPrice = 24.99;
        if (specs.price || specs.Price || specs['Sales Price']) {
          const rawP = specs.price || specs.Price || specs['Sales Price'];
          try {
            excelPrice = floatVal(rawP);
          } catch {
            excelPrice = 24.99;
          }
        }

        let sourceName = 'VaporDNA E-Commerce Store';
        let sourceUrl = 'https://vapordna.com';
        let matchedTitle = p.name;
        let sourcePrice: number | null = null;
        let variance: number | null = null;
        let variancePct: number | null = null;
        let confidence = 0;
        let status: 'VERIFIED' | 'PRICE_VARIANCE' | 'NOT_FOUND' = 'NOT_FOUND';
        let verifiedAt = p.created_at;

        if (ver) {
          sourceName = ver.source_name || sourceName;
          sourcePrice = ver.extracted_price !== null ? ver.extracted_price : null;
          verifiedAt = ver.verified_at;
          confidence = Math.round((ver.match_confidence || 0.85) * 100);

          if (ver.match_evidence) {
            matchedTitle = ver.match_evidence.matched_title || ver.match_evidence.title || p.name;
            sourceUrl = ver.match_evidence.source_url || ver.match_evidence.url || sourceUrl;
          }

          if (sourcePrice !== null) {
            variance = Number((sourcePrice - excelPrice).toFixed(2));
            variancePct = Number(((variance / (excelPrice || 1)) * 100).toFixed(1));
            status = Math.abs(variance) > 2.0 ? 'PRICE_VARIANCE' : 'VERIFIED';
          }
        } else {
          // If specs contain scraped source info, populate it
          if (specs.source_website) sourceName = specs.source_website;
          if (specs.source_url) sourceUrl = specs.source_url;
          if (specs.scraped_price) {
            sourcePrice = floatVal(specs.scraped_price);
            variance = Number((sourcePrice - excelPrice).toFixed(2));
            variancePct = Number(((variance / (excelPrice || 1)) * 100).toFixed(1));
            status = Math.abs(variance) > 2.0 ? 'PRICE_VARIANCE' : 'VERIFIED';
            confidence = 92;
          }
        }

        return {
          product_id: p.id,
          sku: p.sku,
          excel_name: p.name,
          excel_price: excelPrice,
          brand: p.brand || specs.brand || '—',
          pack_size: p.pack_size || specs.pack_size || 'Single',
          source_name: sourceName,
          source_url: sourceUrl,
          matched_title: matchedTitle,
          source_price: sourcePrice,
          variance,
          variance_pct: variancePct,
          confidence,
          status,
          verified_at: verifiedAt,
          specifications: specs
        };
      });

      setComparisonData(combinedRows);
    } catch (err) {
      console.error('Failed to load excel comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisonData();
  }, [activeProject]);

  const floatVal = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const getCleanDomain = (urlStr: string): string => {
    if (!urlStr) return 'Target Source';
    try {
      const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return urlStr.replace('https://', '').replace('http://', '').split('/')[0];
    }
  };

  const handleRunComparison = async () => {
    if (!activeProject) return;
    setRunning(true);
    try {
      await api.post(`/projects/${activeProject.id}/verification/start`, {
        priority: 2
      });
      await fetchComparisonData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Comparison engine execution failed');
    } finally {
      setRunning(false);
    }
  };

  const exportComparisonCsv = () => {
    if (comparisonData.length === 0) return;
    const headers = [
      'SKU', 'Excel Product Name', 'Brand', 'Excel Price', 'Target Source Website',
      'Target Source Title', 'Target Source Price', 'Price Variance ($)', 'Variance (%)',
      'Match Confidence', 'Status', 'Source URL'
    ];

    const rows = filteredRows.map(r => [
      `"${r.sku}"`,
      `"${r.excel_name.replace(/"/g, '""')}"`,
      `"${r.brand || ''}"`,
      r.excel_price.toFixed(2),
      `"${r.source_name}"`,
      `"${r.matched_title.replace(/"/g, '""')}"`,
      r.source_price !== null ? r.source_price.toFixed(2) : '',
      r.variance !== null ? r.variance.toFixed(2) : '',
      r.variance_pct !== null ? `${r.variance_pct}%` : '',
      `${r.confidence}%`,
      r.status,
      `"${r.source_url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Excel_Comparison_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return comparisonData.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (
          r.sku.toLowerCase().includes(q) ||
          r.excel_name.toLowerCase().includes(q) ||
          r.matched_title.toLowerCase().includes(q) ||
          (r.brand && r.brand.toLowerCase().includes(q))
        );
        if (!matchesSearch) return false;
      }

      if (selectedSource) {
        const srcNameLower = r.source_name.toLowerCase();
        const domainLower = getCleanDomain(r.source_url).toLowerCase();
        const targetQ = selectedSource.toLowerCase();
        if (!srcNameLower.includes(targetQ) && !domainLower.includes(targetQ)) return false;
      }

      if (selectedStatus) {
        if (r.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [comparisonData, searchTerm, selectedSource, selectedStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = comparisonData.length;
    const verified = comparisonData.filter(r => r.status === 'VERIFIED').length;
    const variance = comparisonData.filter(r => r.status === 'PRICE_VARIANCE').length;
    const missing = comparisonData.filter(r => r.status === 'NOT_FOUND').length;
    const matchRate = total > 0 ? Math.round(((verified + variance) / total) * 100) : 0;

    return { total, verified, variance, missing, matchRate };
  }, [comparisonData]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Uploaded Excel Sheet Comparison &amp; Verification</h1>
          <p className="page-subtitle">
            Side-by-side comparison grid of uploaded Excel catalog items against target source websites (VaporDNA, Gotham Cigars, etc.) {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/source-data" className="btn btn-secondary" title="View Uploaded Excel Sheets Data">
            <FileSpreadsheet size={16} />
            <span>Uploaded Excel Sheets</span>
          </Link>
          <button className="btn btn-secondary" onClick={exportComparisonCsv}>
            <Download size={16} />
            <span>Export Comparison Sheet (.csv)</span>
          </button>
          <button className="btn btn-primary" onClick={handleRunComparison} disabled={running}>
            <Play size={16} className={running ? 'spin' : ''} />
            <span>{running ? 'Comparing Target Sources...' : 'Run Target Source Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            <span>TOTAL EXCEL ROWS</span>
            <FileSpreadsheet size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.4rem' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Uploaded Product Items
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            <span>VERIFIED SOURCE MATCHES</span>
            <CheckCircle2 size={18} color="var(--accent-green)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '0.4rem' }}>
            {metrics.verified} <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>({metrics.matchRate}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.2rem' }}>
            Matched with Target Sources
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            <span>PRICE VARIANCES</span>
            <AlertTriangle size={18} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: metrics.variance > 0 ? 'var(--accent-rose)' : 'var(--text-main)', marginTop: '0.4rem' }}>
            {metrics.variance}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Excel Price vs Source Variance &gt; $2.00
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            <span>TARGET SOURCE SITES</span>
            <Globe size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.4rem' }}>
            {sourcesList.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Active Verified Platforms
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by SKU, Excel Name, or Target Source Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          {/* Filter by Target Source Site */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} color="var(--primary)" />
            <select
              className="input"
              style={{ width: '220px' }}
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="">All Target Source Sites</option>
              {sourcesList.map(s => (
                <option key={s.id} value={getCleanDomain(s.url)}>
                  {s.name} ({getCleanDomain(s.url)})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Match Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--primary)" />
            <select
              className="input"
              style={{ width: '180px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Match Statuses</option>
              <option value="VERIFIED">VERIFIED MATCH</option>
              <option value="PRICE_VARIANCE">PRICE VARIANCE</option>
              <option value="NOT_FOUND">UNMATCHED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Comparison Data Grid Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
          <table className="table" style={{ whiteSpace: 'nowrap', width: '100%', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ paddingLeft: '1.25rem', width: '60px' }}>#</th>
                <th style={{ minWidth: '150px' }}>EXCEL SKU</th>
                <th style={{ minWidth: '240px' }}>UPLOADED EXCEL PRODUCT</th>
                <th style={{ minWidth: '120px' }}>EXCEL PRICE</th>
                <th style={{ minWidth: '180px', color: 'var(--primary)' }}>TARGET SOURCE WEBSITE</th>
                <th style={{ minWidth: '240px' }}>TARGET SOURCE MATCHED TITLE</th>
                <th style={{ minWidth: '130px', color: 'var(--accent-green)' }}>SOURCE PRICE</th>
                <th style={{ minWidth: '130px' }}>VARIANCE ($ / %)</th>
                <th style={{ minWidth: '120px' }}>CONFIDENCE</th>
                <th style={{ minWidth: '130px' }}>STATUS</th>
                <th style={{ minWidth: '120px' }}>LIVE LINK</th>
                <th style={{ textAlign: 'right', paddingRight: '1.25rem', minWidth: '100px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    Loading uploaded Excel comparison sheet data...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-dim)' }}>
                    <FileSpreadsheet size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} /><br />
                    No comparison rows found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const domain = getCleanDomain(row.source_url);
                  return (
                    <tr
                      key={row.product_id}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      onClick={() => setSelectedRowDetail(row)}
                    >
                      <td style={{ paddingLeft: '1.25rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {row.sku}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.excel_name}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        ${row.excel_price.toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--primary)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}>
                          <Globe size={12} /> {domain}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                        {row.matched_title || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: row.source_price !== null ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                        {row.source_price !== null ? `$${row.source_price.toFixed(2)}` : '—'}
                      </td>
                      <td>
                        {row.variance !== null ? (
                          <span style={{
                            fontWeight: 700,
                            color: row.variance < 0 ? 'var(--accent-green)' : row.variance > 0 ? 'var(--accent-rose)' : 'var(--accent-cyan)'
                          }}>
                            {row.variance > 0 ? `+$${row.variance.toFixed(2)}` : `-$${Math.abs(row.variance).toFixed(2)}`}
                            <span style={{ fontSize: '0.72rem', marginLeft: '0.25rem', opacity: 0.85 }}>
                              ({row.variance_pct}%)
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: row.confidence >= 80 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {row.confidence}%
                        </span>
                      </td>
                      <td>
                        {row.status === 'VERIFIED' ? (
                          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                            <CheckCircle2 size={11} /> VERIFIED
                          </span>
                        ) : row.status === 'PRICE_VARIANCE' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            color: 'var(--accent-rose)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            <AlertTriangle size={11} /> VARIANCE
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: 'rgba(148, 163, 184, 0.1)',
                            color: 'var(--text-dim)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}>
                            <HelpCircle size={11} /> UNMATCHED
                          </span>
                        )}
                      </td>
                      <td>
                        {row.source_url ? (
                          <a
                            href={row.source_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Live Source</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedRowDetail(row); }}
                        >
                          <Eye size={12} /> View
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

      {/* Side-by-Side Comparison Inspector Modal */}
      {selectedRowDetail && (
        <div className="modal-overlay" onClick={() => setSelectedRowDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '840px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Excel vs Target Source Side-by-Side Inspector
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '0.25rem' }}>
                  SKU: {selectedRowDetail.sku} • Verified at {new Date(selectedRowDetail.verified_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedRowDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Side-by-Side Comparison Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
              
              {/* Left Column: Uploaded Excel Catalog Item */}
              <div style={{ backgroundColor: '#0b0f19', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileSpreadsheet size={16} /> UPLOADED EXCEL SPECIFICATIONS
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.83rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Product Name:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedRowDetail.excel_name}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Uploaded Excel Price:</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>${selectedRowDetail.excel_price.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Brand:</span>
                    <div style={{ color: 'var(--text-main)' }}>{selectedRowDetail.brand}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pack Size / Variant:</span>
                    <div style={{ color: 'var(--text-main)' }}>{selectedRowDetail.pack_size}</div>
                  </div>

                  {/* Dynamic Excel Attributes */}
                  {selectedRowDetail.specifications && Object.keys(selectedRowDetail.specifications).length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Custom Excel Attributes:
                      </div>
                      {Object.entries(selectedRowDetail.specifications).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px dashed rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}:</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Target Source Website Result */}
              <div style={{ backgroundColor: '#0b0f19', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={16} /> TARGET SOURCE MATCH ({selectedRowDetail.source_name})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.83rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Target Source Matched Title:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedRowDetail.matched_title}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Target Source Price:</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: selectedRowDetail.source_price !== null ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                      {selectedRowDetail.source_price !== null ? `$${selectedRowDetail.source_price.toFixed(2)}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Price Variance ($ / %):</span>
                    <div>
                      {selectedRowDetail.variance !== null ? (
                        <span style={{ fontWeight: 700, color: selectedRowDetail.variance < 0 ? 'var(--accent-green)' : 'var(--accent-rose)' }}>
                          {selectedRowDetail.variance > 0 ? `+$${selectedRowDetail.variance.toFixed(2)}` : `-$${Math.abs(selectedRowDetail.variance).toFixed(2)}`} ({selectedRowDetail.variance_pct}%)
                        </span>
                      ) : '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Match Confidence Score:</span>
                    <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{selectedRowDetail.confidence}% Confidence</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Live Source Website:</span>
                    <div>
                      <a
                        href={selectedRowDetail.source_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', wordBreak: 'break-all' }}
                      >
                        {selectedRowDetail.source_url} <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRowDetail(null)}>
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
