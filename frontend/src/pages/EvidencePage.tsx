import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Image as ImageIcon } from 'lucide-react';

interface EvidenceRecord {
  id: string;
  project_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  source_id: string;
  source_name: string;
  match_priority_level: string;
  match_confidence: number;
  extracted_price: number | null;
  currency: string;
  evidence_path: string | null;
  evidence_hash: string | null;
  status: string;
  verified_at: string;
}

export const EvidencePage: React.FC = () => {
  const { activeProject } = useProject();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (activeProject) {
      fetchEvidence();
    }
  }, [activeProject]);

  const fetchEvidence = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${activeProject.id}/evidence`);
      setEvidenceList(res.data.items || []);
    } catch (err) {
      console.error('Failed to load evidence', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Evidence & Screenshot Repository
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Cryptographic evidence hashes, verified webpage screenshots & raw data proofs
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading verification evidence proofs...
        </div>
      ) : evidenceList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No verification evidence captured yet. Run a verification job to generate screenshot proofs.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {evidenceList.map((ev) => (
            <div key={ev.id} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {ev.product_name}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                    SKU: {ev.product_sku}
                  </span>
                </div>
                <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                  {ev.status}
                </span>
              </div>

              {/* Evidence proof container: shows a real capture reference or an explicit "not captured" state */}
              <div style={{
                height: '160px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--text-muted)',
                gap: '0.5rem'
              }}>
                <ImageIcon size={32} color="var(--primary)" />
                {ev.evidence_path ? (
                  <>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Captured evidence</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', wordBreak: 'break-all', textAlign: 'center' }}>{ev.evidence_path}</span>
                    {ev.evidence_hash && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Hash: {ev.evidence_hash.slice(0, 16)}...</span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No evidence captured</span>
                )}
              </div>

              <div style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <div>Target Source: <strong style={{ color: 'var(--text-main)' }}>{ev.source_name}</strong></div>
                <div>Extracted Price: <strong style={{ color: 'var(--accent-green)' }}>{ev.extracted_price != null ? `$${ev.extracted_price.toFixed(2)}` : 'Not extracted'}</strong></div>
                <div>Priority Level: <span style={{ color: 'var(--primary)' }}>{ev.match_priority_level}</span></div>
                <div>Captured At: <span>{ev.verified_at?.slice(0, 10)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
