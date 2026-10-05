import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Globe,
  KeyRound,
  CheckCircle2,
  Activity,
  TrendingUp,
  Scale,
  Cpu,
  ShieldCheck,
  FileCheck2,
  FileSpreadsheet,
  Server,
  HeartPulse,
  Settings
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/sources', label: 'Target Sources', icon: Globe },
  { path: '/source-data', label: 'Source Data', icon: Server },
  { path: '/credentials', label: 'Credentials', icon: KeyRound },
  { path: '/verification', label: 'Verified Results', icon: CheckCircle2 },
  { path: '/market-intelligence', label: 'Market Intelligence', icon: TrendingUp },
  { path: '/price-comparison', label: 'Price Comparison', icon: Scale },
  { path: '/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/jobs', label: 'Jobs & Executions', icon: Cpu },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { path: '/evidence', label: 'Evidence & Screenshots', icon: FileCheck2 },
  { path: '/reports', label: 'Reports & Exports', icon: FileSpreadsheet },
  { path: '/workers', label: 'Workers Pool', icon: Server },
  { path: '/health', label: 'System Health', icon: HeartPulse },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          color: 'white',
          fontSize: '1.1rem'
        }}>
          M
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            MarketLens
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            PRODUCT VERIFICATION & INTEL
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{
        flex: 1,
        padding: '1rem 0.75rem',
        overflowY: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                marginBottom: '0.2rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'white' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                transition: 'var(--transition)'
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
        textAlign: 'center'
      }}>
        Internal Workload Engine Active
      </div>
    </aside>
  );
};
