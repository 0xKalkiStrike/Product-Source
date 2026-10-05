import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Layers,
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
  { path: '/workers', label: 'Workers Pool', icon: Layers },
  { path: '/health', label: 'System Health', icon: HeartPulse },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();

  // Close the drawer after navigating on small screens.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo">P</div>
          <div>
            <div className="sidebar-brand-name">Product-Source</div>
            <div className="sidebar-brand-tag">Market Intelligence &amp; Verification Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">Internal workload engine active</div>
      </aside>

      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
    </>
  );
};
