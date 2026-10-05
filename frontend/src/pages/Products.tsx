import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  Upload,
  Plus,
  Filter,
  Search,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  X,
  FileCheck
} from 'lucide-react';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  mpn?: string;
  upc?: string;
  pack_size?: string;
  status: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export const ProductsPage: React.FC = () => {
  const { activeProject, createProject } = useProject();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Drag & Drop Upload State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Product Form State
  const [newSku, setNewSku] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newBrand, setNewBrand] = useState<string>('');
  const [newMpn, setNewMpn] = useState<string>('');
  const [newUpc, setNewUpc] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');

  const fetchProductsData = async () => {
    if (!activeProject) {
      setLoading(false);
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/projects/${activeProject.id}/products`, {
          params: { category_id: selectedCat || undefined, search: searchTerm || undefined }
        }),
        api.get(`/projects/${activeProject.id}/categories`)
      ]);
      setProducts(prodRes.data.items || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load products/categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, [activeProject, selectedCat, searchTerm]);

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setUploadFile(file);
        setUploadError('');
      } else {
        setUploadError('Invalid file type. Please upload a .xlsx, .xls, or .csv file.');
      }
    }
  };

  const isValidFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setUploadFile(file);
        setUploadError('');
      } else {
        setUploadError('Invalid file type. Please upload a .xlsx, .xls, or .csv file.');
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    let proj = activeProject;
    if (!proj) {
      try {
        proj = await createProject('Default Market Scope', 'Auto-created project workspace for product upload');
      } catch (err) {
        setUploadError('Could not initialize active project scope.');
        setUploading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await api.post(`/projects/${proj.id}/products/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      fetchProductsData();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload processing failed.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Product Name,SKU,Brand,Category,UPC,MPN,Price,Pack Size\n" +
      "Premium Cigar Cohiba Behike 52,SKU-COH-001,Cohiba,Cigar,123456789012,MPN-52,24.99,Box of 10\n" +
      "Vape Pod System Starter Kit,SKU-VAP-002,Vaporesso,Vape,234567890123,MPN-VAP1,39.99,Single Pack\n" +
      "Novelty Lighter Special Edition,SKU-NOV-003,Zippo,Novelty,345678901234,MPN-ZIP9,15.00,Single\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "marketlens_sample_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await api.post(`/projects/${activeProject.id}/products`, {
        sku: newSku,
        name: newName,
        brand: newBrand,
        mpn: newMpn,
        upc: newUpc,
        category_id: newCategory || undefined
      });
      setShowAddModal(false);
      setNewSku('');
      setNewName('');
      setNewBrand('');
      setNewMpn('');
      setNewUpc('');
      fetchProductsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create product');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog & Data Upload</h1>
          <p className="page-subtitle">
            Upload Excel or CSV product catalogs, set categories, & map SKU/UPC identifiers {activeProject ? `(Active Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={downloadSampleTemplate} title="Download CSV sample file format">
            <Download size={16} />
            <span>Sample Template</span>
          </button>
          <button className="btn btn-secondary" onClick={() => { setUploadFile(null); setUploadResult(null); setUploadError(''); setShowUploadModal(true); }}>
            <Upload size={16} />
            <span>Upload Excel / CSV</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search catalog by SKU, Product Name, Brand, UPC, MPN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--primary)" />
            <select
              className="input"
              style={{ width: '220px' }}
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product ID / SKU</th>
                <th>Product Name</th>
                <th>Brand</th>
                <th>MPN</th>
                <th>UPC / EAN</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading imported products catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-dim)' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      color: 'var(--primary)'
                    }}>
                      <FileSpreadsheet size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                      No Products in Catalog
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                      Upload your Excel sheet (<code>.xlsx</code> / <code>.csv</code>) to parse products into MarketLens immediately.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => { setUploadFile(null); setUploadResult(null); setUploadError(''); setShowUploadModal(true); }}
                    >
                      <Upload size={16} /> Upload Excel File Now
                    </button>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{p.sku}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.brand || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.mpn || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.upc || '—'}</td>
                    <td>
                      <span className="badge badge-active">
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production-Grade Drag & Drop Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    Upload Product Catalog Excel
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Immediate parsing, automatic column mapping & SKU normalization
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.25rem'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {uploadFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCheck size={44} color="var(--accent-green)" />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {uploadFile.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {(uploadFile.size / 1024).toFixed(1)} KB • Ready for processing
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Upload size={38} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        Drag & Drop your Excel file here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Supports <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code> (Auto-detects Product Name, SKU, Brand, UPC, Price)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Error Alert */}
              {uploadError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid var(--accent-rose)',
                  color: 'var(--accent-rose)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={16} /> {uploadError}
                </div>
              )}

              {/* Success & Imported Products Summary */}
              {uploadResult && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} /> Success! {uploadResult.inserted_count} products imported into project
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    File: {uploadResult.filename} • {uploadResult.row_count} total rows parsed
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={downloadSampleTemplate}
                  style={{ fontSize: '0.8rem' }}
                >
                  <Download size={14} /> Download Sample CSV
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile}>
                    {uploading ? 'Processing File...' : 'Upload & Parse Catalog'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Product</h2>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input type="text" className="input" value={newSku} onChange={(e) => setNewSku(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input type="text" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input type="text" className="input" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MPN</label>
                  <input type="text" className="input" value={newMpn} onChange={(e) => setNewMpn(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">UPC / EAN</label>
                <input type="text" className="input" value={newUpc} onChange={(e) => setNewUpc(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
