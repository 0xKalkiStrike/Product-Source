import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  Globe,
  Search,
  RefreshCw,
  Server
} from 'lucide-react';

interface SourceProductItem {
  id: string;
  source_id: string;
  source_name: string;
  source_product_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  availability: string;
  product_url: string | null;
  collected_at: string;
}

interface SourceOption {
  id: string;
  name: string;
}

export const SourceDataPage: React.FC = () => {
  const { activeProject } = useProject();
  const [items, setItems] = useState<SourceProductItem[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [collecting, setCollecting] = useState<boolean>(false);

  useEffect(() => {
    if (activeProject) {
      fetchSources();
      fetchSourceData();
    }
  }, [activeProject, selectedSource]);

  const fetchSources = async () => {
    if (!activeProject) return;
    try {
      const res = await api.get(`/projects/${activeProject.id}/sources`);
      setSources(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch sources', err);
    }
  };

  const fetchSourceData = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      let url = `/projects/${activeProject.id}/source-data?limit=100`;
      if (selectedSource !== 'ALL') url += `&source_id=${selectedSource}`;
      const res = await api.get(url);
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch source data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCollection = async () => {
    if (!activeProject) return;
    setCollecting(true);
    try {
      await api.post(`/projects/${activeProject.id}/source-data/collect`, {});
      await fetchSourceData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Collection failed');
    } finally {
      setCollecting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.brand && item.brand.toLowerCase().includes(query)) ||
      item.source_product_id.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Source Data
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Raw product information collected from authorized Target Sources
          </p>
        </div>

        <button
          onClick={handleRunCollection}
          disabled={collecting}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={collecting ? 'spin' : ''} />
          <span>{collecting ? 'Collecting Data...' : 'Run Source Collection'}</span>
        </button>
      </div>

      {/* Control Bar */}
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
        {/* Source Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Source:</span>
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

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search collected source products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading collected source data...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <Server size={40} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Source Data Collected Yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Click below to collect product data from configured Target Sources.
          </p>
          <button onClick={handleRunCollection} className="btn btn-primary">
            Run Data Collection
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
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product ID</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Brand</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Availability</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {item.source_product_id}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {item.brand || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {item.category || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                    {item.price ? `$${item.price.toFixed(2)}` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                      {item.availability}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {item.source_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
