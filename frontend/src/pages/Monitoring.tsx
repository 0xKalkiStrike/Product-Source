import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  Activity,
  Play,
  Clock
} from 'lucide-react';

interface MonitoringRuleItem {
  id: string;
  source_id: string;
  source_name: string;
  rule_name: string;
  interval_minutes: number;
  status: string;
  last_executed_at: string | null;
  next_execution_at: string | null;
}

interface ChangeEventItem {
  id: string;
  source_id: string;
  change_type: string;
  old_value: any;
  new_value: any;
  detected_at: string;
}

export const MonitoringPage: React.FC = () => {
  const { activeProject } = useProject();
  const [rules, setRules] = useState<MonitoringRuleItem[]>([]);
  const [events, setEvents] = useState<ChangeEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);

  useEffect(() => {
    if (activeProject) {
      fetchMonitoringData();
    }
  }, [activeProject]);

  const fetchMonitoringData = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        api.get(`/projects/${activeProject.id}/monitoring/rules`),
        api.get(`/projects/${activeProject.id}/monitoring/events`)
      ]);
      setRules(rRes.data.items || []);
      setEvents(eRes.data.items || []);
    } catch (err) {
      console.error('Failed to load monitoring data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSweep = async () => {
    if (!activeProject) return;
    setExecuting(true);
    try {
      await api.post(`/projects/${activeProject.id}/monitoring/execute`, {});
      await fetchMonitoringData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Monitoring sweep failed');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading monitoring schedules & change events...</div>;
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Continuous Source Monitoring
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Automated recurring source schedules, change detection & live events
          </p>
        </div>

        <button
          onClick={handleTriggerSweep}
          disabled={executing}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={16} className={executing ? 'spin' : ''} />
          <span>{executing ? 'Executing Monitoring Sweep...' : 'Run Immediate Sweep'}</span>
        </button>
      </div>

      {/* Rules Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--primary)" /> Monitoring Schedules & Rules
        </h3>

        {rules.length === 0 ? (
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            No custom monitoring rules configured. Default system rule runs hourly across active target sources.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {rules.map((r) => (
              <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.rule_name}</span>
                  <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Source: <strong>{r.source_name}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                  Interval: Every {r.interval_minutes} minutes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Events Feed */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--accent-cyan)" /> Detected Change Events Feed
        </h3>

        {events.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}>
            No change events detected yet. Click "Run Immediate Sweep" to scan target sources for price or stock status changes.
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
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Event ID</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Event Type</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Previous Value</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>New Value</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Detected At</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {ev.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--primary)' }}>
                        {ev.change_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {JSON.stringify(ev.old_value)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                      {JSON.stringify(ev.new_value)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {ev.detected_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
