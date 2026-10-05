import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Cpu, Plus, Play, Pause, XCircle, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface Job {
  id: string;
  task_type: string;
  priority: number;
  status: string;
  progress: number;
  total_items: number;
  processed_items: number;
  worker_id?: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
}

export const JobsPage: React.FC = () => {
  const { activeProject } = useProject();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // New Job Form State
  const [taskType, setTaskType] = useState('VERIFICATION');
  const [priority, setPriority] = useState(3);

  const fetchJobs = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${activeProject.id}/jobs`);
      setJobs(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [activeProject]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await api.post(`/projects/${activeProject.id}/jobs`, {
        task_type: taskType,
        priority: Number(priority),
        payload: { target: "Batch Execution Payload" }
      });
      setShowModal(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enqueue job');
    }
  };

  const handleAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    if (!activeProject) return;
    try {
      await api.post(`/projects/${activeProject.id}/jobs/${jobId}/${action}`);
      fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} job`);
    }
  };

  const getPriorityBadge = (p: number) => {
    if (p === 1) return <span className="badge badge-danger">CRITICAL (1)</span>;
    if (p === 2) return <span className="badge badge-warning">HIGH (2)</span>;
    if (p === 3) return <span className="badge badge-active">NORMAL (3)</span>;
    return <span className="badge badge-neutral">LOW (4)</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> COMPLETED</span>;
      case 'RUNNING':
        return <span className="badge badge-active"><Clock size={12} className="spin" /> RUNNING</span>;
      case 'QUEUED':
        return <span className="badge badge-warning">QUEUED</span>;
      case 'RETRYING':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> RETRYING</span>;
      case 'PAUSED':
        return <span className="badge badge-neutral">PAUSED</span>;
      case 'FAILED':
        return <span className="badge badge-danger"><XCircle size={12} /> FAILED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workload Queue & Job Monitoring</h1>
          <p className="page-subtitle">
            Internal queue isolation, priority management & live execution progress {activeProject ? `(Scope: ${activeProject.name})` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Enqueue Job Task</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Task Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Assigned Worker</th>
                <th>Retries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && jobs.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading workload queue...</td></tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    <Cpu size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} /><br />
                    No active or historical jobs in queue. Click "Enqueue Job Task" to schedule background work.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                      JOB-{j.id.substring(0, 8)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{j.task_type}</td>
                    <td>{getPriorityBadge(j.priority)}</td>
                    <td>{getStatusBadge(j.status)}</td>
                    <td style={{ minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${j.progress}%`, height: '100%', backgroundColor: j.status === 'FAILED' ? 'var(--accent-rose)' : 'var(--primary)', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{j.progress}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {j.worker_id ? <code>{j.worker_id}</code> : 'Unassigned'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{j.retry_count} / {j.max_retries}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {j.status === 'RUNNING' || j.status === 'QUEUED' ? (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleAction(j.id, 'pause')}>
                            <Pause size={12} />
                          </button>
                        ) : j.status === 'PAUSED' ? (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleAction(j.id, 'resume')}>
                            <Play size={12} />
                          </button>
                        ) : null}
                        {j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && (
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleAction(j.id, 'cancel')}>
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enqueue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Enqueue Background Workload</h2>
            <form onSubmit={handleCreateJob}>
              <div className="form-group">
                <label className="form-label">Task Type</label>
                <select className="input" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                  <option value="VERIFICATION">Product Verification Batch</option>
                  <option value="MONITORING">Continuous Source Monitoring</option>
                  <option value="SCREENSHOT">Evidence Screenshot Capture</option>
                  <option value="PRICE_CALC">Market Price Calculation</option>
                  <option value="REPORT">Report Generation</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                  <option value={1}>CRITICAL (1) - Immediate Execution</option>
                  <option value={2}>HIGH (2) - High Priority</option>
                  <option value={3}>NORMAL (3) - Standard Workload</option>
                  <option value={4}>LOW (4) - Background Idle</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Enqueue Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
