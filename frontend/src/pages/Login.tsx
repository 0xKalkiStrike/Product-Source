import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-dark)',
      padding: '1.5rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '0.75rem'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Platform Sign In</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Product Verification & Market Intelligence Platform
          </p>
        </div>

        {/* Tab Selector Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#0f172a',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: 'white'
            }}
          >
            Sign In
          </div>
          <Link
            to="/register"
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-muted)'
            }}
          >
            Create Account
          </Link>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Orchestrator'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Need a new account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
