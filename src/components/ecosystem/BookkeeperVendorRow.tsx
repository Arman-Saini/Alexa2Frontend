import type { KhataVendorLedger } from '../../api/khataApi';

const VENDOR_ACCENT: Record<string, string> = {
  doodhwala: 'var(--copper-300)',
  dhobi: 'var(--copper-500)',
  maid: 'var(--ember-300)',
  newspaper: 'var(--text-secondary)',
};

const VENDOR_LABEL: Record<string, string> = {
  doodhwala: 'Milkman',
  dhobi: 'Laundry',
  maid: 'House Help',
  newspaper: 'Newspaper',
};

function VendorIcon({ vendor }: { vendor: string }) {
  const stroke = VENDOR_ACCENT[vendor] ?? 'var(--text-secondary)';
  switch (vendor) {
    case 'doodhwala':
      // Milk bottle
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6">
          <path d="M9 3h6v3l2 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3V3Z" />
          <path d="M8 13h8" />
        </svg>
      );
    case 'dhobi':
      // Hanger
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6">
          <path d="M12 4a2 2 0 1 1 2 2" />
          <path d="M12 6v2" />
          <path d="M4 20l8-6 8 6" />
          <path d="M2 20h20" />
        </svg>
      );
    case 'maid':
      // Broom
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6">
          <path d="M19 5 9 15" />
          <path d="M9 15 4 20l1.5-4.5L9 12l3 3-1 1Z" />
          <path d="M9 12l3-3" />
        </svg>
      );
    case 'newspaper':
    default:
      // Folded paper
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6">
          <path d="M4 5h13a2 2 0 0 1 2 2v11a1 1 0 0 1-1.5.87L16 18l-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1L4 18V5Z" />
          <path d="M7 9h7M7 12h7M7 15h4" />
        </svg>
      );
  }
}

export interface BookkeeperVendorRowProps {
  vendorLedger: KhataVendorLedger;
}

export function BookkeeperVendorRow({ vendorLedger }: BookkeeperVendorRowProps) {
  const accent = VENDOR_ACCENT[vendorLedger.vendor] ?? 'var(--text-secondary)';
  const label = VENDOR_LABEL[vendorLedger.vendor] ?? vendorLedger.vendor;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid var(--void-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            aria-hidden
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: `${accent}22`,
              border: `1px solid ${accent}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <VendorIcon vendor={vendorLedger.vendor} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Local ledger tracked
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          ₹{vendorLedger.subtotal_inr.toLocaleString('en-IN')}
        </div>
      </div>

      {vendorLedger.entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', paddingLeft: 'calc(34px + var(--space-3))' }}>
          {vendorLedger.entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                {entry.raw}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 'var(--space-3)' }}>
                ₹{entry.amount_inr.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
