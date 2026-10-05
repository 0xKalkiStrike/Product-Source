import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileCheck,
  Eye,
  Layers
} from 'lucide-react';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  mpn?: string;
  upc?: string;
  ean?: string;
  pack_size?: string;
  variant?: string;
  specifications?: Record<string, any>;
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
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

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

  // Extract all unique dynamic specification keys across all loaded products
  const dynamicColumns = useMemo(() => {
    const keysSet = new Set<string>();
    const standardKeys = new Set([
      'id', 'sku', 'name', 'brand', 'mpn', 'upc', 'ean', 'pack_size',
      'variant', 'status', 'created_at', 'project_id', 'category_id', 'updated_at'
    ]);

    products.forEach(p => {
      if (p.specifications && typeof p.specifications === 'object') {
        Object.keys(p.specifications).forEach(k => {
          const kLower = k.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
          if (!standardKeys.has(kLower) && !['sku', 'name', 'id'].includes(kLower)) {
            keysSet.add(k);
          }
        });
      }
    });

    return Array.from(keysSet);
  }, [products]);

  const extractTitleFromUrl = (urlStr: string): string => {
    if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
      return urlStr;
    }
    try {
      const cleanUrl = urlStr.split('?')[0].split('#')[0];
      const filename = decodeURIComponent(cleanUrl.split('/').pop() || '');
      let title = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
      title = title.replace(/[_\-]+\d+(\.\d+)+$/, '');
      title = title.replace(/__\d+.*$/, '');
      title = title.replace(/---/g, ' - ').replace(/[-_]/g, ' ');
      title = title.replace(/\s+/g, ' ').trim();
      return title || urlStr;
    } catch {
      return urlStr;
    }
  };

  // Safety net to get real product name if a legacy DB record contains a URL as name
  const getDisplayName = (p: Product) => {
    if (!p) return '—';
    if (p.name && !p.name.startsWith('http://') && !p.name.startsWith('https://')) {
      return p.name;
    }
    if (p.name && (p.name.startsWith('http://') || p.name.startsWith('https://'))) {
      const extracted = extractTitleFromUrl(p.name);
      if (extracted && extracted !== p.name) {
        return extracted;
      }
    }
    if (p.specifications && typeof p.specifications === 'object') {
      for (const [k, v] of Object.entries(p.specifications)) {
        const kLower = k.toLowerCase();
        if (
          (kLower.includes('name') || kLower.includes('title') || kLower.includes('item') || kLower.includes('desc')) &&
          typeof v === 'string' &&
          v &&
          !v.startsWith('http://') &&
          !v.startsWith('https://')
        ) {
          return v;
        }
      }
    }
    return p.name ? extractTitleFromUrl(p.name) : 'Unnamed Product';
  };

  // Render cell content with smart image URL preview
  const renderCellContent = (val: any) => {
    if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-dim)' }}>—</span>;
    const strVal = String(val);
    const isImage = (
      strVal.startsWith('http://') ||
      strVal.startsWith('https://') ||
      /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(strVal)
    );

    if (isImage) {
      return (
        <a
          href={strVal}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}
          title={strVal}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={strVal}
            alt="Product"
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              flexShrink: 0
            }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <span style={{ fontSize: '0.78rem', textDecoration: 'underline', whiteSpace: 'nowrap' }}>View Image</span>
        </a>
      );
    }

    return <span>{strVal}</span>;
  };

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
      "Product Name,SKU,Brand,Category,UPC,MPN,Price,Pack Size,Image URL\n" +
      "Premium Cigar Cohiba Behike 52,SKU-COH-001,Cohiba,Cigar,123456789012,MPN-52,24.99,Box of 10,https://example.com/cohiba.jpg\n" +
      "Vape Pod System Starter Kit,SKU-VAP-002,Vaporesso,Vape,234567890123,MPN-VAP1,39.99,Single Pack,https://example.com/vape.jpg\n" +
      "Novelty Lighter Special Edition,SKU-NOV-003,Zippo,Novelty,345678901234,MPN-ZIP9,15.00,Single,https://example.com/lighter.jpg\n";

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

  const [modalSearch, setModalSearch] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const isNotEmpty = (val: any) => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim().toLowerCase();
    return str !== '' && str !== '—' && str !== '---' && str !== '-' && str !== 'null' && str !== 'none' && str !== 'undefined';
  };

  const hasBrand = useMemo(() => products.some(p => isNotEmpty(p.brand)), [products]);
  const hasMpn = useMemo(() => products.some(p => isNotEmpty(p.mpn)), [products]);
  const hasUpc = useMemo(() => products.some(p => isNotEmpty(p.upc) || isNotEmpty(p.ean)), [products]);

  const totalCols = 2 + (hasBrand ? 1 : 0) + (hasMpn ? 1 : 0) + (hasUpc ? 1 : 0) + dynamicColumns.length + 3;

  // Compile all attributes present for a given product row
  const getProductAttributesList = (p: Product) => {
    if (!p) return [];
    const list: { key: string; label: string; value: any; category: 'Standard' | 'Excel Column' }[] = [];
    const seenKeys = new Set<string>();

    const addAttr = (key: string, label: string, val: any, cat: 'Standard' | 'Excel Column') => {
      const kNorm = key.toLowerCase().trim();
      if (!seenKeys.has(kNorm) && isNotEmpty(val)) {
        seenKeys.add(kNorm);
        list.push({ key, label, value: val, category: cat });
      }
    };

    addAttr('name', 'Product Name', getDisplayName(p), 'Standard');
    addAttr('sku', 'Product SKU / Code', p.sku, 'Standard');
    if (p.brand) addAttr('brand', 'Brand', p.brand, 'Standard');
    if (p.mpn) addAttr('mpn', 'MPN', p.mpn, 'Standard');
    if (p.upc) addAttr('upc', 'UPC', p.upc, 'Standard');
    if (p.ean) addAttr('ean', 'EAN', p.ean, 'Standard');
    if (p.pack_size) addAttr('pack_size', 'Pack Size', p.pack_size, 'Standard');
    if (p.variant) addAttr('variant', 'Variant', p.variant, 'Standard');

    if (p.specifications && typeof p.specifications === 'object') {
      Object.entries(p.specifications).forEach(([k, val]) => {
        const kNorm = k.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
        if (['name', 'product name', 'sku', 'id'].includes(kNorm)) return;
        const formattedLabel = k.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        addAttr(k, formattedLabel, val, 'Excel Column');
      });
    }

    addAttr('status', 'Verification Status', p.status, 'Standard');
    addAttr('created_at', 'Import Timestamp', new Date(p.created_at).toLocaleString(), 'Standard');

    return list;
  };

  const copyRowDataToClipboard = (p: Product) => {
    const attrs = getProductAttributesList(p);
    const textData = attrs.map(a => `${a.label}: ${typeof a.value === 'object' ? JSON.stringify(a.value) : a.value}`).join('\n');
    navigator.clipboard.writeText(textData);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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

      {/* Main Dynamic Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto', paddingLeft: '0.25rem' }}>
          <table className="table" style={{ whiteSpace: 'nowrap', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '1.5rem', minWidth: '170px' }}>PRODUCT ID / SKU</th>
                <th style={{ minWidth: '240px' }}>PRODUCT NAME</th>
                {hasBrand && <th>BRAND</th>}
                {hasMpn && <th>MPN</th>}
                {hasUpc && <th>UPC / EAN</th>}
                {dynamicColumns.map((colKey) => (
                  <th key={colKey} style={{ color: 'var(--primary)', textTransform: 'uppercase', minWidth: '130px' }}>
                    {colKey.replace(/_/g, ' ')}
                  </th>
                ))}
                <th>STATUS</th>
                <th>CREATED AT</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem', minWidth: '130px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading imported products catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-dim)' }}>
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
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { setModalSearch(''); setSelectedProductDetail(p); }}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)', paddingLeft: '1.5rem', minWidth: '170px' }}>{p.sku}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getDisplayName(p)}
                    </td>
                    {hasBrand && <td style={{ color: 'var(--text-muted)' }}>{p.brand || '—'}</td>}
                    {hasMpn && <td style={{ color: 'var(--text-muted)' }}>{p.mpn || '—'}</td>}
                    {hasUpc && <td style={{ color: 'var(--text-muted)' }}>{p.upc || p.ean || '—'}</td>}
                    
                    {/* Dynamic Extra Columns from Excel specifications */}
                    {dynamicColumns.map((colKey) => {
                      const specVal = p.specifications?.[colKey];
                      return (
                        <td key={colKey} style={{ color: 'var(--text-muted)' }}>
                          {renderCellContent(specVal)}
                        </td>
                      );
                    })}

                    <td>
                      <span className="badge badge-active">
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={(e) => { e.stopPropagation(); setModalSearch(''); setSelectedProductDetail(p); }}
                        title="View all uploaded Excel attributes"
                      >
                        <Eye size={13} />
                        <span>All Columns</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View All Excel Attributes / Columns Modal */}
      {selectedProductDetail && (
        <div className="modal-overlay" onClick={() => setSelectedProductDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {getDisplayName(selectedProductDetail)}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    SKU: {selectedProductDetail.sku}
                  </span>
                  <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                    {getProductAttributesList(selectedProductDetail).length} Excel Columns Found
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Toolbar (Search + Copy) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.25rem', fontSize: '0.82rem', height: '36px' }}
                  placeholder="Filter column names or values..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              
              <button
                className="btn btn-secondary"
                style={{ height: '36px', fontSize: '0.8rem', padding: '0 0.85rem' }}
                onClick={() => copyRowDataToClipboard(selectedProductDetail)}
              >
                {copySuccess ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Layers size={14} />}
                <span>{copySuccess ? 'Copied Row Data!' : 'Copy Row Attributes'}</span>
              </button>
            </div>

            {/* Attributes List / Table */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0b0f19', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
              <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '38%', paddingLeft: '1rem', color: 'var(--primary)' }}>EXCEL COLUMN NAME</th>
                    <th style={{ width: '62%', paddingRight: '1rem', color: 'var(--primary)' }}>PRODUCT VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {getProductAttributesList(selectedProductDetail)
                    .filter(item => {
                      if (!modalSearch) return true;
                      const q = modalSearch.toLowerCase();
                      return item.label.toLowerCase().includes(q) || String(item.value).toLowerCase().includes(q);
                    })
                    .map((item) => (
                      <tr key={item.key}>
                        <td style={{ padding: '0.75rem 1rem', wordBreak: 'break-word', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.83rem' }}>
                            {item.label}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: item.category === 'Excel Column' ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', wordBreak: 'break-word', color: 'var(--text-main)', fontSize: '0.85rem', verticalAlign: 'top' }}>
                          {renderCellContent(item.value)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedProductDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                        Supports <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code> (Auto-detects Product Name, SKU, Brand, UPC, Price, Image URLs & Custom Fields)
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
