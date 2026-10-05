import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HeartPulse, Database, Cpu, HardDrive, Server, RefreshCw } from 'lucide-react';

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">System & Workload Health</h1>
          <p className="page-subtitle">
            Real-time telemetry, database connection check, & internal orchestration engine stats
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchHealth} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary Status Grid */}
      <div className="grid-stats">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Overall System Status</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                <span className={`badge badge-${health?.status === 'healthy' ? 'success' : 'warning'}`}>
                  {health?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            <HeartPulse size={24} color="var(--accent-green)" />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Database Layer</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                <span className="badge badge-success">
                  {health?.database?.toUpperCase() || 'HEALTHY'}
                </span>
              </div>
            </div>
            <Database size={24} color="var(--primary)" />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CPU Utilization</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {health?.system_metrics?.cpu_percent ?? 0}%
              </div>
            </div>
            <Cpu size={24} color="var(--accent-cyan)" />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Memory Usage</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {health?.system_metrics?.memory_percent ?? 0}% ({health?.system_metrics?.memory_used_mb} MB)
              </div>
            </div>
            <HardDrive size={24} color="var(--accent-amber)" />
          </div>
        </div>
      </div>

      {/* Orchestration Engine Diagnostic Panel */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={18} color="var(--primary)" />
          Internal Execution & Workload Engine Diagnostics
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          backgroundColor: '#0f172a',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engine State</div>
            <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
              {health?.orchestration_engine?.status || 'INITIALIZED'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Workers</div>
            <div style={{ fontWeight: 600 }}>{health?.orchestration_engine?.active_workers ?? 0}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Healthy Workers</div>
            <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{health?.orchestration_engine?.healthy_workers ?? 0}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Queued Jobs</div>
            <div style={{ fontWeight: 600 }}>{health?.orchestration_engine?.queued_jobs ?? 0}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uptime</div>
            <div style={{ fontWeight: 600 }}>{health?.uptime_seconds ? `${health.uptime_seconds}s` : '0s'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
