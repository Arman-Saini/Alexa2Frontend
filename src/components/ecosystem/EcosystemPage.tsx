import { Link } from 'react-router-dom';
import { ScrollReveal } from '../shared/ScrollReveal';
import { MCPExplainer } from './MCPExplainer';
import { BookkeeperLedger } from './BookkeeperLedger';
import { AppStoreSection } from '../appstore/AppStoreSection';

/**
 * `#/ecosystem` route — the App Store / MCP integration page. Ordinary
 * page scroll (not an Act), reached via ActNav's "App Store" link.
 */
export function EcosystemPage() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: 'var(--space-20) var(--space-8) var(--space-24)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-12)',
        backgroundColor: 'var(--void-950)',
        boxSizing: 'border-box',
      }}
    >
      <Link
        to="/"
        style={{
          position: 'fixed',
          top: 'var(--space-6)',
          left: 'var(--space-6)',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          zIndex: 20,
        }}
      >
        ← Back to Hearth
      </Link>

      {/* Main 2D App Store Section with Split Cards */}
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <AppStoreSection />
      </div>

      {/* MCP Explainer */}
      <div style={{ width: '100%', maxWidth: '1040px', marginTop: 'var(--space-8)' }}>
        <ScrollReveal>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 3vw, 30px)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            How Integrations Work (MCP)
          </h2>
        </ScrollReveal>
        <MCPExplainer />
      </div>

      {/* Bookkeeper Ledger */}
      <div style={{ width: '100%', maxWidth: '640px', marginTop: 'var(--space-8)' }}>
        <ScrollReveal>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 3vw, 30px)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            Active Ledger Connection
          </h2>
        </ScrollReveal>
        <BookkeeperLedger />
      </div>
    </div>
  );
}
