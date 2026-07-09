import { useEffect, useState } from 'react';
import { LensPanel } from '../shared/LensPanel';
import type { KhataSettleResponse } from '../../api/khataApi';
import { ApiError } from '../../api/client';

export interface BookkeeperSettleModalProps {
  open: boolean;
  onClose: () => void;
  settle: () => Promise<KhataSettleResponse>;
}

/**
 * Settle-up flow: calls the real settle() backend action when opened and
 * renders the resulting per-vendor breakdown plus a real, clickable UPI
 * payment link (not faked — it's whatever the backend returns).
 */
export function BookkeeperSettleModal({ open, onClose, settle }: BookkeeperSettleModalProps) {
  const [result, setResult] = useState<KhataSettleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Resetting transient request state when `open` flips true is the
    // intended trigger here, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    settle()
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not settle up right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <LensPanel open={open} onClose={handleClose} variant="module" size="md">
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Settle up
        </h2>

        {loading && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Working out what's owed to each vendor…
          </p>
        )}

        {error && !loading && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ember-500)' }}>
            {error}
          </p>
        )}

        {result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {result.lines.map((line) => (
                <div
                  key={`${line.vendor}-${line.detail}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--void-border)',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {line.vendor_hi}
                      <span style={{ color: 'var(--text-tertiary)' }}> · {line.detail}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', flexShrink: 0 }}>
                    ₹{line.amount_inr.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
                Total
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600, color: 'var(--ember-500)' }}>
                ₹{result.total_inr.toLocaleString('en-IN')}
              </span>
            </div>

            {result.speech && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                “{result.speech}”
              </p>
            )}

            <a
              href={result.upi_link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--r-md)',
                backgroundColor: 'var(--copper-500)',
                color: 'var(--void-950)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Pay via UPI
            </a>
          </div>
        )}

        <button
          onClick={handleClose}
          style={{
            marginTop: 'var(--space-6)',
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </LensPanel>
  );
}
