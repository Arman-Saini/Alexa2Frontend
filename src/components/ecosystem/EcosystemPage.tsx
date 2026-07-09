import { useEffect, useState } from 'react';
import { ScrollReveal } from '../shared/ScrollReveal';
import { MCPExplainer } from './MCPExplainer';
import { ModuleRing, type MockIntegration } from './ModuleRing';
import { BookkeeperLedger } from './BookkeeperLedger';
import { appStoreApi, type AppStoreModule } from '../../api/appStoreApi';
import { ApiError } from '../../api/client';

const MOCK_INTEGRATIONS: MockIntegration[] = [
  {
    id: 'zomato',
    name: 'Zomato',
    category: 'kitchen',
    description: 'Reorder a regular dish the moment the kitchen sensor notices the fridge is running low — concept only, no backend behind this card.',
  },
  {
    id: 'swiggy',
    name: 'Swiggy Instamart',
    category: 'kitchen',
    description: 'Grocery top-ups triggered from the same pantry signals Bookkeeper already reads — same MCP Server shape, not wired up yet.',
  },
  {
    id: 'urban-company',
    name: 'Urban Company',
    category: 'india_specific',
    description: 'Book a technician the moment a device reports a fault state, instead of a person noticing days later.',
  },
  {
    id: 'ecobee',
    name: 'Ecobee Sync',
    category: 'climate',
    description: 'Mirror the smart thermostat schedule from this twin onto a real HVAC controller.',
  },
];

/**
 * `#/ecosystem` route — the App Store / MCP integration page. Ordinary
 * page scroll (not an Act), reached via ActNav's "App Store" link.
 */
export function EcosystemPage() {
  const [modules, setModules] = useState<AppStoreModule[]>([]);
  const [modulesError, setModulesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    appStoreApi
      .getModules()
      .then((res) => {
        if (!cancelled) setModules(res.modules);
      })
      .catch((err) => {
        if (!cancelled) setModulesError(err instanceof ApiError ? err.message : 'Failed to load modules.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: 'var(--space-20) var(--space-8) var(--space-24)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-16)',
      }}
    >
      <a
        href="#"
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
        ← Back to HomeSense
      </a>

      <ScrollReveal>
        <div style={{ textAlign: 'center', maxWidth: 720, marginTop: 'var(--space-8)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            The ecosystem
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-4)',
              lineHeight: 1.6,
            }}
          >
            HomeSense isn't a closed box. Bookkeeper below is a real, working integration; everything
            else on this page shows how the same door opens for anything else — without HomeSense's
            core ever needing to know it exists in advance.
          </p>
        </div>
      </ScrollReveal>

      <div style={{ width: '100%', maxWidth: 1040 }}>
        <MCPExplainer />
      </div>

      <div style={{ width: '100%', maxWidth: 640 }}>
        <BookkeeperLedger />
      </div>

      <div style={{ width: '100%', maxWidth: 1040 }}>
        <ScrollReveal>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px, 2.4vw, 28px)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Modules
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            Live App Store modules alongside concept integrations, normalized into the same card so
            it's obvious which is which — not to blur the line.
          </p>
        </ScrollReveal>

        {modulesError && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ember-500)', marginBottom: 'var(--space-6)' }}>
            {modulesError}
          </p>
        )}

        <ModuleRing realModules={modules} mockModules={MOCK_INTEGRATIONS} />
      </div>
    </div>
  );
}
