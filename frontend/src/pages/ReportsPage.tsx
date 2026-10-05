import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { FileSpreadsheet, Download, FileText, FileCode, File } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeProject } = useProject();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'excel' | 'csv' | 'json' | 'pdf') => {
    if (!activeProject) return;
    setExporting(format);
    try {
      const response = await api.get(
        `/projects/${activeProject.id}/reports/export?format=${format}`,
        { responseType: 'blob' }
      );

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

      const blob = new Blob([response.data], { type: mimeTypes[format] });
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

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Exportable Reports & Intelligence Briefings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Generate enterprise verified results reports in Excel, CSV, JSON, and PDF formats
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', maxWidth: '900px' }}>
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
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            <span>{exporting === 'csv' ? 'Generating CSV...' : 'Export CSV (.csv)'}</span>
          </button>
        </div>

        {/* JSON */}
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
          <button
            onClick={() => handleExport('json')}
            disabled={!!exporting}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            <span>{exporting === 'json' ? 'Generating JSON...' : 'Export JSON (.json)'}</span>
          </button>
        </div>

        {/* PDF */}
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
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            <span>{exporting === 'pdf' ? 'Generating PDF...' : 'Export PDF (.pdf)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
