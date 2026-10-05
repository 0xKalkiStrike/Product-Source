import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  TrendingUp,
  DollarSign,
  Scale,
  Search,
  Layers
} from 'lucide-react';

interface MarketSummary {
  total_products: number;
  verified_products: number;
  unverified_products: number;
  price_mismatches: number;
  market_avg_price: number;
  market_lowest_price: number;
  market_highest_price: number;
  currency: string;
}

interface MarketProductItem {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  excel_price: number;
  lowest_price: number;
  highest_price: number;
  average_price: number;
  median_price: number;
  price_range: number;
  price_difference: number;
  currency: string;
  sources_count: number;
}

export const MarketIntelligencePage: React.FC = () => {
  const { activeProject } = useProject();
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [products, setProducts] = useState<MarketProductItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (activeProject) {
      fetchIntelligence();
    }
  }, [activeProject]);

  const fetchIntelligence = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const [sumRes, prodRes] = await Promise.all([
        api.get(`/projects/${activeProject.id}/market-intelligence/summary`),
        api.get(`/projects/${activeProject.id}/market-intelligence/products?limit=100`)
      ]);
      setSummary(sumRes.data);
      setProducts(prodRes.data.items || []);
    } catch (err) {
      console.error('Failed to fetch market intelligence', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query));
  });

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Market Intelligence & Price Analytics
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          USD normalized lowest, highest, average, and median price distribution across target sources
        </p>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>TOTAL PRODUCTS</span>
              <Layers size={16} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.5rem' }}>
              {summary.total_products}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>
              {summary.verified_products} Verified
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>MARKET AVG PRICE</span>
              <DollarSign size={16} color="var(--accent-green)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '0.5rem' }}>
              ${summary.market_avg_price.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              USD Normalized
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>PRICE RANGE (MIN - MAX)</span>
              <TrendingUp size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.5rem' }}>
              ${summary.market_lowest_price.toFixed(2)} - ${summary.market_highest_price.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Cross-source spread
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <span>PRICE MISMATCHES</span>
              <Scale size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: summary.price_mismatches > 0 ? '#ef4444' : 'var(--accent-green)', marginTop: '0.5rem' }}>
              {summary.price_mismatches}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Detected Variance &gt; $2.00
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: 'var(--bg-surface)',
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem'
      }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter by product name, SKU or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        />
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Computing price analytics...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No product price intelligence data found.
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
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>SKU</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Excel Price</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Lowest</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Highest</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Median</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {item.sku}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    ${item.excel_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                    ${item.lowest_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    ${item.highest_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary)' }}>
                    ${item.average_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    ${item.median_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: item.price_difference > 0 ? 'var(--accent-green)' : item.price_difference < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                    {item.price_difference >= 0 ? `+$${item.price_difference.toFixed(2)}` : `-$${Math.abs(item.price_difference).toFixed(2)}`}
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

export const PriceComparisonPage: React.FC = () => {
  return <MarketIntelligencePage />;
};
