import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, ensureArray } from '../services/api';
import {
  Globe,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Server,
  ChevronLeft,
  ChevronRight,
  Play,
  X
} from 'lucide-react';

export interface ScrapedProductItem {
  id: string;
  project_id: string;
  source_id: string;
  source_name: string;
  source_product_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sku: string | null;
  mpn: string | null;
  upc: string | null;
  ean: string | null;
  price: number | null;
  msrp: number | null;
  discount: number;
  currency: string;
  pack_size: string | null;
  availability: string;
  product_url: string | null;
  image_url: string | null;
  collected_at: string | null;
}

export interface TargetSourceSite {
  id: string;
  name: string;
  url: string;
  source_type?: string;
  status?: string;
}

export const ScrapedSourcesPage: React.FC = () => {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<boolean>(true);
  const [collecting, setCollecting] = useState<boolean>(false);
  const [sourcesList, setSourcesList] = useState<TargetSourceSite[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('ALL');
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProductItem[]>([]);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('ALL');
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Fetch target sources list
  const fetchSourcesList = async () => {
    if (!activeProject) return;
    try {
      const res = await api.get(`/projects/${activeProject.id}/sources`);
      setSourcesList(ensureArray<TargetSourceSite>(res.data));
    } catch (err) {
      console.error('Failed to fetch target sources list', err);
    }
  };

  // Fetch scraped source products
  const fetchScrapedData = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let url = `/projects/${activeProject.id}/source-data?limit=1000`;
      if (selectedSourceId !== 'ALL') {
        url += `&source_id=${selectedSourceId}`;
      }
      const res = await api.get(url);
      setScrapedProducts(ensureArray<ScrapedProductItem>(res.data));
    } catch (err) {
      console.error('Failed to fetch scraped target sources data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourcesList();
  }, [activeProject?.id]);

  useEffect(() => {
    setCurrentPage(1);
    fetchScrapedData();
  }, [activeProject?.id, selectedSourceId]);

  // Run real live scraper collection across target sources
  const handleRunCollection = async () => {
    if (!activeProject) return;
    setCollecting(true);
    try {
      await api.post(`/projects/${activeProject.id}/source-data/live-scrape`, {
        source_ids: selectedSourceId !== 'ALL' ? [selectedSourceId] : undefined
      });

      // Poll live scrape status until completed
      let attempts = 0;
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000));
        const stRes = await api.get(`/projects/${activeProject.id}/source-data/live-scrape/status`);
        if (!stRes.data || !stRes.data.running) break;
        attempts++;
      }

      await fetchScrapedData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Scraper execution failed');
    } finally {
      setCollecting(false);
    }
  };

  // Currently selected source metadata
  const currentSourceMeta = useMemo(() => {
    if (selectedSourceId === 'ALL') return null;
    const safeSources = Array.isArray(sourcesList) ? sourcesList : [];
    return safeSources.find((s) => s.id === selectedSourceId) || null;
  }, [selectedSourceId, sourcesList]);

  // Filtered scraped items
  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(scrapedProducts) ? scrapedProducts : [];
    return safeProducts.filter((item) => {
      if (selectedAvailability !== 'ALL' && item.availability !== selectedAvailability) {
        return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(s);
        const brandMatch = (item.brand || '').toLowerCase().includes(s);
        const catMatch = (item.category || '').toLowerCase().includes(s);
        const sourceMatch = (item.source_name || '').toLowerCase().includes(s);
        const skuMatch = (item.source_product_id || item.sku || '').toLowerCase().includes(s);

        return nameMatch || brandMatch || catMatch || sourceMatch || skuMatch;
      }
      return true;
    });
  }, [scrapedProducts, selectedAvailability, searchTerm]);

  // Paginated items
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [filteredProducts, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;

  // Summary Metrics
  const metrics = useMemo(() => {
    const safeProducts = Array.isArray(scrapedProducts) ? scrapedProducts : [];
    const total = safeProducts.length;
    const inStock = safeProducts.filter((p) => p.availability === 'IN_STOCK').length;
    const inStockPct = total > 0 ? Math.round((inStock / total) * 100) : 0;
    
    const validPrices = safeProducts.map((p) => p.price).filter((p): p is number => p !== null && p > 0);
    const avgPrice = validPrices.length > 0
      ? (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2)
      : '0.00';

    const uniqueSources = new Set(safeProducts.map((p) => p.source_name)).size;

    return { total, inStock, inStockPct, avgPrice, uniqueSources };
  }, [scrapedProducts]);

  // Export CSV
  const exportScrapedCsv = () => {
    if (filteredProducts.length === 0) return;
    const headers = [
      'Source ID',
      'Target Source Site',
      'Product ID',
      'Product Name',
      'Brand',
      'Category',
      'Scraped Price ($)',
      'Availability',
      'Product URL',
      'Collected Timestamp'
    ];

    const csvRows = [headers.join(',')];
    filteredProducts.forEach((p) => {
      const row = [
        `"${p.source_id}"`,
        `"${(p.source_name || '').replace(/"/g, '""')}"`,
        `"${(p.source_product_id || p.sku || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.price !== null ? p.price.toFixed(2) : '',
        `"${p.availability}"`,
        `"${(p.product_url || '').replace(/"/g, '""')}"`,
        `"${(p.collected_at || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = currentSourceMeta
      ? `scraped_${currentSourceMeta.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`
      : 'all_scraped_target_sources_data.csv';
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
              SCRAPED MARKET DATA
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Project: <strong>{activeProject?.name || 'Default Workspace'}</strong>
            </span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontSize: '1.75rem' }}>
            <Globe className="text-primary" size={28} />
            Scraped Target Sources Data
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            View and inspect web scraped product catalogs and prices extracted from target source ecommerce websites.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchScrapedData}
            className="btn btn-secondary"
            disabled={loading}
            title="Reload Scraped Data"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleRunCollection}
            className="btn btn-primary"
            disabled={collecting}
            title="Trigger Web Scraper across Target Sources"
          >
            <Play size={16} className={collecting ? 'spin' : ''} />
            {collecting ? 'Scraping Sources...' : 'Trigger Web Scraper'}
          </button>
          <button
            onClick={exportScrapedCsv}
            className="btn btn-secondary"
            disabled={filteredProducts.length === 0}
            title="Export scraped items to CSV"
          >
            <Download size={16} />
            Export Scraped CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Scraped Products
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {metrics.total} Items
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Globe size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Target Websites
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {metrics.uniqueSources} Sites
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              In-Stock Availability
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '0.1rem' }}>
              {metrics.inStockPct}% ({metrics.inStock})
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Avg Market Price
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              ${metrics.avgPrice}
            </div>
          </div>
        </div>
      </div>

      {/* Target Source Dropdown Selector Card */}
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
              htmlFor="target-source-dropdown"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Globe size={18} style={{ color: 'var(--color-primary)' }} />
              Select Scraped Target Source Site:
            </label>
            <select
              id="target-source-dropdown"
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
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
              <option value="ALL">
                &bull; All Scraped Target Sources ({scrapedProducts.length} scraped products)
              </option>
              {sourcesList.map((src) => {
                const count = scrapedProducts.filter((p) => p.source_id === src.id).length;
                return (
                  <option key={src.id} value={src.id}>
                    {src.name} &mdash; ({src.url}){count > 0 ? ` [${count} products]` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Source Info Pill */}
          {currentSourceMeta && (
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
                <span style={{ color: 'var(--text-muted)' }}>Target Site:</span>{' '}
                <strong style={{ color: '#3b82f6' }}>{currentSourceMeta.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>URL:</span>{' '}
                <a
                  href={currentSourceMeta.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
                >
                  {currentSourceMeta.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Scraped Items:</span>{' '}
                <strong style={{ color: '#10b981' }}>
                  {scrapedProducts.filter((p) => p.source_id === currentSourceMeta.id).length}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Scraped Table Card */}
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
              placeholder="Search by Title, SKU, Brand, Category, Source..."
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

          {/* Availability Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              value={selectedAvailability}
              onChange={(e) => {
                setSelectedAvailability(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '160px' }}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
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
            </select>
          </div>
        </div>

        {/* Counter */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Displaying <strong>{filteredProducts.length}</strong> of <strong>{scrapedProducts.length}</strong> scraped products
          {currentSourceMeta && ` from target source site "${currentSourceMeta.name}"`}
        </div>

        {/* Table Container */}
        <div className="table-responsive" style={{ maxHeight: '650px', overflowY: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ width: '120px' }}>Item ID / SKU</th>
                <th>Scraped Product Title</th>
                <th style={{ width: '130px' }}>Brand</th>
                <th style={{ width: '140px' }}>Category</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Scraped Price ($)</th>
                <th style={{ width: '110px' }}>Stock Status</th>
                <th style={{ width: '160px' }}>Target Source Website</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <RefreshCw className="spin" size={24} style={{ marginBottom: '0.5rem' }} />
                    <div>Loading scraped market data...</div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <Globe size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <div>No scraped products found for the selected target source.</div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod, idx) => (
                  <tr key={prod.id || idx}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {prod.source_product_id || prod.sku || `SRC_${idx + 1}`}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ color: 'var(--text-main)' }}>{prod.name}</div>
                    </td>
                    <td>{prod.brand || '—'}</td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {prod.category || 'General'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      {prod.price !== null ? `$${prod.price.toFixed(2)}` : 'N/A'}
                    </td>
                    <td>
                      <span
                        className={`badge ${prod.availability === 'IN_STOCK' ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {prod.availability === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'rgba(168, 85, 247, 0.1)',
                          color: '#a855f7',
                          whiteSpace: 'nowrap',
                          maxWidth: '150px',
                          display: 'inline-block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={prod.source_name}
                      >
                        {prod.source_name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {prod.product_url ? (
                        <a
                          href={prod.product_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                          title="Open scraped product page"
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
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
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredProducts.length} total scraped products)
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
    </div>
  );
};
