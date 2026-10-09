import React, { useState, useEffect } from 'react';
import { api, ensureArray } from '../services/api';
import { Server, RefreshCw, Cpu, HardDrive } from 'lucide-react';

export interface Worker {
  id: string;
  worker_name: string;
  worker_type: string;
  status: string;
  current_job_id?: string;
  cpu_usage: number;
  memory_mb: number;
  total_jobs_completed: number;
  total_jobs_failed: number;
  last_heartbeat: string;
}

export const WorkersPage: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [restartingId, setRestartingId] = useState<string | null>(null);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(ensureArray<Worker>(res.data));
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async (workerId: string) => {
    setRestartingId(workerId);
    try {
      await api.post(`/workers/${workerId}/restart`);
      await fetchWorkers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to restart worker');
    } finally {
      setRestartingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Worker Pool & Execution Isolation</h1>
          <p className="page-subtitle">
            Reusable asyncio worker pool telemetry, heartbeat tracking & auto-recovery controls
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchWorkers} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Pool</span>
        </button>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Pool Size</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{workers.length} Workers</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Healthy Workers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-green)' }}>
            {workers.filter(w => w.status === 'IDLE' || w.status === 'BUSY').length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active Tasks Executing</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>
            {workers.filter(w => w.status === 'BUSY').length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unhealthy / Crashed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-rose)' }}>
            {workers.filter(w => w.status === 'UNHEALTHY').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Task Capability</th>
                <th>Status</th>
                <th>Current Job</th>
                <th>Telemetry (CPU / RAM)</th>
                <th>Completed</th>
                <th>Failed</th>
                <th>Last Heartbeat</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && workers.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Loading worker pool telemetry...</td></tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    <Server size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} /><br />
                    No workers registered in pool.
                  </td>
                </tr>
              ) : (
                workers.map((w) => {
                  const isRestarting = restartingId === w.id;
                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Server size={16} />
                        {w.worker_name}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.worker_type}</td>
                      <td>
                        <span className={`badge badge-${w.status === 'BUSY' ? 'active' : w.status === 'IDLE' ? 'healthy' : 'danger'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {w.current_job_id ? <code style={{ color: 'var(--accent-cyan)' }}>JOB-{w.current_job_id.substring(0, 8)}</code> : 'Idle'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Cpu size={12} /> {w.cpu_usage}% | <HardDrive size={12} /> {w.memory_mb} MB
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{w.total_jobs_completed}</td>
                      <td style={{ color: w.total_jobs_failed > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                        {w.total_jobs_failed}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(w.last_heartbeat).toLocaleTimeString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleRestart(w.id)}
                          disabled={isRestarting}
                        >
                          <RefreshCw size={12} className={isRestarting ? 'spin' : ''} />
                          <span>Restart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
