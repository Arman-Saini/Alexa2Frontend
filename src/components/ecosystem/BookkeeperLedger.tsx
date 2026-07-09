import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { ScrollReveal } from '../shared/ScrollReveal';
import { BookkeeperVendorRow } from './BookkeeperVendorRow';
import { BookkeeperSettleModal } from './BookkeeperSettleModal';
import { useBookkeeper } from '../../hooks/useBookkeeper';

// No real paper-grain texture asset exists yet — a faint CSS-drawn diagonal
// hatch stands in so the ledger still reads as a physical book, not a bare
// glass card.
const PAPER_FALLBACK_BG =
  'repeating-linear-gradient(135deg, rgba(192,134,98,0.035) 0px, rgba(192,134,98,0.035) 1px, transparent 1px, transparent 12px)';

export function BookkeeperLedger() {
  const { ledger, loading, error, settle } = useBookkeeper();
  const [settleOpen, setSettleOpen] = useState(false);

  const grandTotal = ledger?.vendors.reduce((sum, v) => sum + v.subtotal_inr, 0) ?? 0;

  return (
    <ScrollReveal>
      <GlassCard padding="lg" glow="ember">
        <div style={{ backgroundImage: PAPER_FALLBACK_BG, margin: 'calc(-1 * var(--space-6))', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2.4vw, 28px)', color: 'var(--text-primary)' }}>
              Bookkeeper
            </h2>
            {ledger?.month && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {ledger.month}
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            The real, running vendor ledger — milkman, laundry, house help, newspaper — logged straight
            from Hinglish voice, no manual entry.
          </p>

          {loading && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Loading this month's ledger…
            </p>
          )}

          {error && !loading && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ember-500)' }}>
              {error}
            </p>
          )}

          {ledger && !loading && !error && (
            <>
              <div>
                {ledger.vendors.map((v) => (
                  <BookkeeperVendorRow key={v.vendor} vendorLedger={v} />
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'var(--space-6)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--copper-700)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)' }}>
                  Grand total
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 600, color: 'var(--ember-500)' }}>
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => setSettleOpen(true)}
                style={{
                  marginTop: 'var(--space-6)',
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--copper-500)',
                  backgroundColor: 'transparent',
                  color: 'var(--copper-300)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Settle up
              </button>
            </>
          )}
        </div>
      </GlassCard>

      <BookkeeperSettleModal open={settleOpen} onClose={() => setSettleOpen(false)} settle={settle} />
    </ScrollReveal>
  );
}
