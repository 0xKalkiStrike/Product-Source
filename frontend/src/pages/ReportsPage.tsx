import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Download,
  FileText,
  FileCode,
  File,
  Eye,
  X,
  Copy,
  Check,
  Search
} from 'lucide-react';

interface PreviewState {
  format: 'excel' | 'csv' | 'json' | 'pdf';
  title: string;
  blobUrl?: string;
  jsonData?: any;
  csvText?: string;
}

export const ReportsPage: React.FC = () => {
  const { activeProject } = useProject();
  const [exporting, setExporting] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  const fetchBlob = async (format: 'excel' | 'csv' | 'json' | 'pdf') => {
    if (!activeProject) throw new Error('No active project');
    const response = await api.get(
      `/projects/${activeProject.id}/reports/export?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  };

  const handleExport = async (format: 'excel' | 'csv' | 'json' | 'pdf') => {
    if (!activeProject) return;
    setExporting(format);
    try {
      const data = await fetchBlob(format);

      const mimeTypes: Record<string, string> = {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        json: 'application/json',
        pdf: 'application/pdf'
      };

      const extensions: Record<string, string> = {
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
        pdf: 'pdf'
      };

      const blob = new Blob([data], { type: mimeTypes[format] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marketlens_verified_report_${activeProject.name.replace(/\s+/g, '_')}.${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to generate report export');
    } finally {
      setExporting(null);
    }
  };

  const handlePreview = async (format: 'excel' | 'csv' | 'json' | 'pdf') => {
    if (!activeProject) return;
    setPreviewing(format);
    try {
      const data = await fetchBlob(format);

      if (format === 'pdf') {
        const blob = new Blob([data], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        setPreviewState({
          format: 'pdf',
          title: `PDF Executive Report - ${activeProject.name}`,
          blobUrl
        });
      } else if (format === 'json') {
        const text = await data.text();
        const jsonData = JSON.parse(text);
        setPreviewState({
          format: 'json',
          title: `JSON Report Payload - ${activeProject.name}`,
          jsonData
        });
      } else if (format === 'csv' || format === 'excel') {
        const text = await data.text();
        setPreviewState({
          format: format,
          title: `${format.toUpperCase()} Report Preview - ${activeProject.name}`,
          csvText: text
        });
      }
    } catch (err) {
      console.error('Preview failed', err);
      alert('Failed to load report preview');
    } finally {
      setPreviewing(null);
    }
  };

  const closePreview = () => {
    if (previewState?.blobUrl) {
      window.URL.revokeObjectURL(previewState.blobUrl);
    }
    setPreviewState(null);
    setCopied(false);
    setPreviewSearch('');
  };

  const handleCopyJson = () => {
    if (previewState?.jsonData) {
      navigator.clipboard.writeText(JSON.stringify(previewState.jsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to parse CSV text into headers and rows for table preview
  const renderCsvTable = (csv: string) => {
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return <div>No data available</div>;

    const headers = lines[0].split(',').map(h => h.replace(/^"(.*)"$/, '$1'));
    const rows = lines.slice(1).map(line => {
      // simple csv split
      return line.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1'));
    });

    const filteredRows = rows.filter(r => {
      if (!previewSearch) return true;
      return r.some(c => c.toLowerCase().includes(previewSearch.toLowerCase()));
    });

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '0.5rem 0.75rem', color: 'var(--text-main)' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Exportable Reports & Intelligence Briefings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          View, preview, and generate enterprise verified results reports in PDF, JSON, Excel, and CSV formats
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', maxWidth: '900px' }}>
        {/* PDF Executive Briefing */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <File size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Executive Briefing (.pdf)</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Printable PDF report document</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Clean executive summary highlighting market price variances, verified matches, and source coverage.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handlePreview('pdf')}
              disabled={!!previewing || !!exporting}
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Eye size={15} />
              <span>{previewing === 'pdf' ? 'Loading...' : 'View PDF'}</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting || !!previewing}
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          </div>
        </div>

        {/* Structured JSON */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)' }}>
              <FileCode size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Structured JSON (.json)</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full programmatic payload</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Raw verification results with field-level provenance metadata and cryptographic evidence hashes.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handlePreview('json')}
              disabled={!!previewing || !!exporting}
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Eye size={15} />
              <span>{previewing === 'json' ? 'Loading...' : 'View JSON'}</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={!!exporting || !!previewing}
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>{exporting === 'json' ? 'Exporting...' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* Excel */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Excel Workbook (.xlsx)</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formatted multi-column spreadsheet</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Includes Product IDs, SKUs, UPCs, Excel Prices, Target Source Matches, Verified Prices & Provenance details.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              <span>{exporting === 'excel' ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* CSV */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>
              <FileText size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Comma Separated (.csv)</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard data exchange format</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ideal for ingestion into enterprise data warehouses, pandas pipelines, and BI dashboards.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handlePreview('csv')}
              disabled={!!previewing || !!exporting}
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Eye size={15} />
              <span>{previewing === 'csv' ? 'Loading...' : 'View CSV Data'}</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={!!exporting || !!previewing}
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Report Data / Document Viewer Modal */}
      {previewState && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: previewState.format === 'pdf' ? '950px' : '850px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(15,23,42,0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {previewState.format === 'pdf' && <File size={20} color="#f59e0b" />}
                {previewState.format === 'json' && <FileCode size={20} color="var(--accent-cyan)" />}
                {(previewState.format === 'csv' || previewState.format === 'excel') && <FileText size={20} color="var(--primary)" />}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {previewState.title}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {previewState.format === 'json' && (
                  <button
                    onClick={handleCopyJson}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleExport(previewState.format)}
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={14} />
                  <span>Download {previewState.format.toUpperCase()}</span>
                </button>

                <button
                  onClick={closePreview}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '1rem', position: 'relative' }}>
              {previewState.format === 'pdf' && previewState.blobUrl && (
                <iframe
                  src={previewState.blobUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  title="PDF Viewer"
                />
              )}

              {previewState.format === 'json' && (
                <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#090d16', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: '#38bdf8', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(previewState.jsonData, null, 2)}
                  </pre>
                </div>
              )}

              {(previewState.format === 'csv' || previewState.format === 'excel') && previewState.csvText && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Filter records..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="input"
                      style={{ width: '260px', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
                    {renderCsvTable(previewState.csvText)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
