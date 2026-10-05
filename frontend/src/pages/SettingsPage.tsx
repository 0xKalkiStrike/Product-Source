import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    global_concurrency_limit: 100,
    max_worker_pool_size: 10,
    default_rate_limit_rpm: 60,
    execution_timeout_seconds: 300,
    cpu_overload_threshold_pct: 85.0,
    ram_overload_threshold_pct: 90.0,
    enable_auto_checkpointing: true,
    max_retry_attempts: 3
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      alert('System orchestration settings updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading system settings...</div>;
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Platform & Orchestration Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Configure internal workload engine concurrency limits, worker pools, and resource control policies
        </p>
      </div>

      <form onSubmit={handleSave} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={18} /> Internal Orchestration Controls
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Global Concurrency Limit
            </label>
            <input
              type="number"
              value={settings.global_concurrency_limit}
              onChange={(e) => setSettings({ ...settings, global_concurrency_limit: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Max active background tasks globally</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Worker Pool Size
            </label>
            <input
              type="number"
              value={settings.max_worker_pool_size}
              onChange={(e) => setSettings({ ...settings, max_worker_pool_size: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Dedicated background worker threads</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Default Source Rate Limit (RPM)
            </label>
            <input
              type="number"
              value={settings.default_rate_limit_rpm}
              onChange={(e) => setSettings({ ...settings, default_rate_limit_rpm: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Requests per minute per source adapter</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Execution Timeout (Seconds)
            </label>
            <input
              type="number"
              value={settings.execution_timeout_seconds}
              onChange={(e) => setSettings({ ...settings, execution_timeout_seconds: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Max duration before worker task timeout</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              CPU Overload Threshold (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.cpu_overload_threshold_pct}
              onChange={(e) => setSettings({ ...settings, cpu_overload_threshold_pct: parseFloat(e.target.value) || 80.0 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Threshold to pause launching new job tasks</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Max Task Retries
            </label>
            <input
              type="number"
              value={settings.max_retry_attempts}
              onChange={(e) => setSettings({ ...settings, max_retry_attempts: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Automatic retries on worker failure</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Orchestration Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
