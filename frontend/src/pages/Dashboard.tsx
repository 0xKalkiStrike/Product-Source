import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import {
  FolderKanban,
  PackageCheck,
  CheckCircle,
  XCircle,
  PlayCircle,
  Clock,
  Activity,
  Server,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeProject } = useProject();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const metricCards = [
    { title: 'Total Projects', value: stats?.summary?.total_projects || 0, icon: FolderKanban, color: 'var(--primary)' },
    { title: 'Total Products', value: stats?.summary?.total_products || 0, icon: PackageCheck, color: 'var(--accent-cyan)' },
    { title: 'Verified Products', value: stats?.summary?.verified_products || 0, icon: CheckCircle, color: 'var(--accent-green)' },
    { title: 'Failed Verification', value: stats?.summary?.failed_products || 0, icon: XCircle, color: 'var(--accent-rose)' },
    { title: 'Active Executions', value: stats?.summary?.active_jobs || 0, icon: PlayCircle, color: 'var(--accent-cyan)' },
    { title: 'Queued Workload', value: stats?.summary?.queued_jobs || 0, icon: Clock, color: 'var(--accent-amber)' },
    { title: 'Monitoring Rules', value: stats?.summary?.monitoring_tasks || 0, icon: Activity, color: 'var(--primary)' },
    { title: 'Healthy Workers', value: stats?.summary?.healthy_workers || 0, icon: Server, color: 'var(--accent-green)' },
    { title: 'Failed Executions', value: stats?.summary?.failed_executions || 0, icon: AlertTriangle, color: 'var(--accent-rose)' },
    { title: 'Avg Market Price (USD)', value: `$${(stats?.summary?.avg_market_price_usd || 0).toFixed(2)}`, icon: DollarSign, color: 'var(--accent-green)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            System overview & live performance stats {activeProject ? `for project "${activeProject.name}"` : ''}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-stats">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="card card-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-main)' }}>
                  {loading ? '...' : card.value}
                </div>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color
              }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2 Column Main Section */}
      <div className="grid-2col">
        {/* Audit Activity */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Recent System Activity Log
          </h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_activity?.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                      No audit activity logged yet.
                    </td>
                  </tr>
                ) : (
                  stats?.recent_activity?.map((log: any) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.action}</td>
                      <td>
                        <span className={`badge badge-${log.status === 'SUCCESS' ? 'success' : 'danger'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Engine Status Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Workload Engine Architecture
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Internal scheduling, concurrency isolation, and worker pool monitor.
            </p>

            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Engine Pipeline Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }} />
                SCHEDULER & WORKER POOL READY
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              • No external cron dependencies<br />
              • Worker pool & queue isolated execution<br />
              • High availability auto-recovery enabled
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Phase 1 Foundation Operational
          </div>
        </div>
      </div>
    </div>
  );
};
