import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface UploadedFileItem {
  id: string;
  project_id: string;
  filename: string;
  file_size: number;
  row_count: number;
  valid_count: number;
  error_count: number;
  status: string;
  created_at: string;
}

export interface SheetRow {
  id?: string;
  _row_num: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  excel_price: number;
  sales_price?: string;
  pack_size?: string;
  variant?: string;
  mpn?: string;
  upc?: string;
  ean?: string;
  specifications?: Record<string, any>;
  _source_file?: string;
  _uploaded_at?: string;
}

export const SourceDataPage: React.FC = () => {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('all');
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRowDetail, setSelectedRowDetail] = useState<SheetRow | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Fetch uploaded files list
  const fetchUploadedFiles = async () => {
    if (!activeProject) return;
    try {
      const res = await api.get(`/projects/${activeProject.id}/uploaded-files`);
      setUploadedFiles(res.data || []);
    } catch (err) {
      console.error('Failed to fetch uploaded files list', err);
    }
  };

  // Fetch sheet data
  const fetchSheetData = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fileParam = selectedFileId === 'all' ? '' : selectedFileId;
      const res = await api.get(
        `/projects/${activeProject.id}/uploaded-files/data?file_id=${fileParam}&limit=1500`
      );
      const items = res.data.items || [];
      setSheetRows(items);
    } catch (err) {
      console.error('Failed to fetch raw excel sheet data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, [activeProject?.id]);

  useEffect(() => {
    setCurrentPage(1);
    fetchSheetData();
  }, [activeProject?.id, selectedFileId]);

  // Selected file object metadata
  const currentFileMeta = useMemo(() => {
    if (selectedFileId === 'all') return null;
    return uploadedFiles.find((f) => f.id === selectedFileId) || null;
  }, [selectedFileId, uploadedFiles]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    sheetRows.forEach((r) => {
      const cat = r.category || r.specifications?.category || r.specifications?.Category;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [sheetRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return sheetRows.filter((row) => {
      if (selectedCategory && row.category !== selectedCategory) {
        return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const skuMatch = (row.sku || '').toLowerCase().includes(s);
        const nameMatch = (row.name || '').toLowerCase().includes(s);
        const brandMatch = (row.brand || '').toLowerCase().includes(s);
        const catMatch = (row.category || '').toLowerCase().includes(s);
        const mpnMatch = (row.mpn || '').toLowerCase().includes(s);
        const upcMatch = (row.upc || '').toLowerCase().includes(s);
        
        let specsMatch = false;
        if (row.specifications) {
          specsMatch = JSON.stringify(row.specifications).toLowerCase().includes(s);
        }

        return skuMatch || nameMatch || brandMatch || catMatch || mpnMatch || upcMatch || specsMatch;
      }
      return true;
    });
  }, [sheetRows, selectedCategory, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Export filtered rows to CSV
  const exportToCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      'Row Num',
      'SKU',
      'Product Name',
      'Brand',
      'Category',
      'Excel Price ($)',
      'Sales Price',
      'Pack Size',
      'Variant',
      'MPN',
      'UPC',
      'Source File',
      'Uploaded At'
    ];

    const csvRows = [headers.join(',')];
    filteredRows.forEach((r) => {
      const row = [
        r._row_num,
        `"${(r.sku || '').replace(/"/g, '""')}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.brand || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        r.excel_price,
        `"${(r.sales_price || '').replace(/"/g, '""')}"`,
        `"${(r.pack_size || '').replace(/"/g, '""')}"`,
        `"${(r.variant || '').replace(/"/g, '""')}"`,
        `"${(r.mpn || '').replace(/"/g, '""')}"`,
        `"${(r.upc || '').replace(/"/g, '""')}"`,
        `"${(r._source_file || '').replace(/"/g, '""')}"`,
        `"${(r._uploaded_at || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = currentFileMeta
      ? `excel_${currentFileMeta.filename.replace(/\.[^/.]+$/, '')}.csv`
      : 'uploaded_excel_sheets_data.csv';
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
              EXCEL CATALOG VIEWER
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Scope: <strong>{activeProject?.name || 'Default Workspace'}</strong>
            </span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontSize: '1.75rem' }}>
            <FileSpreadsheet className="text-primary" size={28} />
            Uploaded Excel Sheets Data
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Select any uploaded Excel file from the dropdown to view its full catalog contents, rows, and columns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchSheetData}
            className="btn btn-secondary"
            disabled={loading}
            title="Reload Sheet Data"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            disabled={filteredRows.length === 0}
            title="Export filtered records to CSV"
          >
            <Download size={16} />
            Export CSV
          </button>
          <Link to="/excel-comparison" className="btn btn-primary" title="Go to Price Comparison Sheet">
            <ExternalLink size={16} />
            View Excel Comparison
          </Link>
        </div>
      </div>

      {/* Dropdown Selector Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem 1.25rem'
          }}
        >
          <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="uploaded-sheet-select"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileSpreadsheet size={18} style={{ color: 'var(--color-primary)' }} />
              Select Uploaded Excel Sheet:
            </label>
            <select
              id="uploaded-sheet-select"
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="form-control"
              style={{
                padding: '0.65rem 0.9rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '6px',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <option value="all">
                &bull; All Uploaded Excel Sheets ({sheetRows.length} total rows)
              </option>
              {uploadedFiles.map((file) => {
                const dateStr = file.created_at
                  ? new Date(file.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : '';
                return (
                  <option key={file.id} value={file.id}>
                    {file.filename} &mdash; ({file.row_count} rows {dateStr ? `• Uploaded ${dateStr}` : ''})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Metadata pill for selected sheet */}
          {currentFileMeta && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '0.85rem'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sheet Name:</span>{' '}
                <strong style={{ color: '#3b82f6' }}>{currentFileMeta.filename}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>File Size:</span>{' '}
                <strong>{formatFileSize(currentFileMeta.file_size)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rows Count:</span>{' '}
                <strong style={{ color: '#10b981' }}>{currentFileMeta.row_count}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                  {currentFileMeta.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}
        >
          {/* Search Field */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search by SKU, Name, Brand, Specifications..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '38px' }}
            />
            {searchTerm && (
              <X
                size={16}
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              />
            )}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '180px' }}
            >
              <option value="">All Categories ({categoriesList.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Rows Per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Rows per page:</span>
            <select
              className="form-control"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ width: '80px', padding: '0.35rem 0.5rem' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Displaying <strong>{filteredRows.length}</strong> of <strong>{sheetRows.length}</strong> Excel rows
          {currentFileMeta && ` from sheet "${currentFileMeta.filename}"`}
        </div>

        {/* Table Container */}
        <div className="table-responsive" style={{ maxHeight: '650px', overflowY: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ width: '120px' }}>SKU</th>
                <th>Product Name</th>
                <th style={{ width: '130px' }}>Brand</th>
                <th style={{ width: '140px' }}>Category</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Excel Price ($)</th>
                <th style={{ width: '120px' }}>Sales Price</th>
                <th style={{ width: '120px' }}>Pack Size</th>
                <th style={{ width: '140px' }}>Source Excel File</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Specs</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <RefreshCw className="spin" size={24} style={{ marginBottom: '0.5rem' }} />
                    <div>Loading Excel sheet data...</div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <FileSpreadsheet size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <div>No Excel sheet rows found matching the search criteria.</div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => (
                  <tr key={row.id || `${row.sku}_${idx}`}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {row._row_num}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {row.sku}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ color: 'var(--text-main)' }}>{row.name}</div>
                      {row.variant && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Variant: {row.variant}
                        </div>
                      )}
                    </td>
                    <td>{row.brand || '—'}</td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {row.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                      ${typeof row.excel_price === 'number' ? row.excel_price.toFixed(2) : (row.specifications?.price ? Number(row.specifications.price).toFixed(2) : '0.00')}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {row.sales_price && !row.sales_price.includes('undefined')
                        ? row.sales_price
                        : (row.excel_price ? `$${Number(row.excel_price).toFixed(2)}` : '—')}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{row.pack_size || 'Standard'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          whiteSpace: 'nowrap',
                          maxWidth: '130px',
                          display: 'inline-block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={row._source_file}
                      >
                        {row._source_file || 'Gotham.xlsx'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedRowDetail(row)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        title="View full row specifications"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ color: 'var(--text-muted)' }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} total items)
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <span style={{ padding: '0 0.5rem', color: 'var(--text-muted)' }}>
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row Specs Modal */}
      {selectedRowDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => setSelectedRowDetail(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.5rem',
              position: 'relative',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-secondary">Row #{selectedRowDetail._row_num}</span>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem' }}>{selectedRowDetail.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  SKU: <code>{selectedRowDetail.sku}</code> &bull; Brand: {selectedRowDetail.brand}
                </div>
              </div>
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                Full Excel Row Attributes
              </h4>
              <div style={{ background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, width: '180px', color: 'var(--text-muted)' }}>
                        Product Name
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{selectedRowDetail.name}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>SKU</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><code>{selectedRowDetail.sku}</code></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Excel Price</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#10b981' }}>
                        ${selectedRowDetail.excel_price?.toFixed(2)}
                      </td>
                    </tr>

                    {selectedRowDetail.specifications &&
                      Object.entries(selectedRowDetail.specifications).map(([key, value]) => {
                        if (key === 'source_file' || key === 'upload_id') return null;
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {key}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', wordBreak: 'break-word' }}>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setSelectedRowDetail(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
