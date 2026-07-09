import { GlassCard } from '../shared/GlassCard';
import { ScrollReveal } from '../shared/ScrollReveal';

interface ServerBox {
  name: string;
  live: boolean;
}

const SERVERS: ServerBox[] = [
  { name: 'Bookkeeper', live: true },
  { name: 'Zomato', live: false },
  { name: 'Swiggy', live: false },
  { name: 'Urban Company', live: false },
];

const EXPLAINER_CARDS = [
  {
    title: 'Host',
    body: "Hearth Core is the Host — the one surface a judge (or a homeowner) actually talks to. It owns the conversation and decides which integration a request belongs to. You never talk to Bookkeeper directly; you talk to Hearth, and Hearth routes.",
  },
  {
    title: 'Client',
    body: "Inside the Host, a Client is the connection Hearth keeps open to each integration — one per Server. It's the same client shape whether it's talking to the real Bookkeeper ledger or, conceptually, to Zomato. Adding a new integration means adding a Client, not rewriting Hearth.",
  },
  {
    title: 'Server',
    body: "Each integration is a Server that exposes Tools (actions like “log a vendor payment” or “place an order”) and Resources (data like this month's ledger). Bookkeeper is a real, working Server today — it exposes exactly this shape, which is what makes the settle-up flow below actually call a backend.",
  },
  {
    title: 'Why it matters',
    body: "Without a shared protocol, N apps integrating with M services means N×M bespoke connectors. MCP collapses that to N + M — Hearth implements the Host/Client side once, and every integration only has to speak Server. That's why Bookkeeper wasn't a one-off hack, and why Zomato or Swiggy could plug in the same way without touching Hearth's core.",
  },
];

/**
 * Plain-language Host/Client/Server explainer grounded in the app's real
 * Bookkeeper integration, plus a restrained CSS "bus" diagram: Hearth
 * Core (Host+Client) at the top, connected down to each Server.
 */
export function MCPExplainer() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      <ScrollReveal>
        <div style={{ maxWidth: '640px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3vw, 32px)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Why this isn't a one-off hack
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Hearth's integration architecture follows the same shape as the Model Context Protocol —
            a Host talks through Clients to any number of Servers, each exposing the same kind of Tools
            and Resources. Bookkeeper is the real one running today; the others below show how the same
            door opens for anything else.
          </p>
        </div>
      </ScrollReveal>

      {/* Diagram */}
      <ScrollReveal delay={0.1}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <GlassCard padding="sm" glow="ember" className="text-center">
            <div style={{ padding: '0 var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-primary)' }}>
                Hearth Core
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ember-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Host + Client
              </div>
            </div>
          </GlassCard>

          {/* vertical stem */}
          <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--void-border)' }} />
          {/* horizontal bus */}
          <div style={{ height: '1px', width: '100%', maxWidth: '760px', backgroundColor: 'var(--void-border)' }} />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 'var(--space-6)',
              marginTop: '0',
              width: '100%',
              maxWidth: '760px',
            }}
          >
            {SERVERS.map((s) => (
              <div key={s.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--void-border)' }} />
                <GlassCard padding="sm" glow={s.live ? 'ember' : 'none'}>
                  <div style={{ padding: '0 var(--space-2)', textAlign: 'center', minWidth: '110px', opacity: s.live ? 1 : 0.65 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {s.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '10px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: s.live ? 'var(--ember-500)' : 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}
                    >
                      Server{s.live ? ' · Live' : ' · Concept'}
                    </div>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Explainer cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {EXPLAINER_CARDS.map((card, i) => (
          <ScrollReveal key={card.title} delay={i * 0.08}>
            <GlassCard padding="md">
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  color: 'var(--copper-300)',
                  marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {card.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {card.body}
              </p>
            </GlassCard>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
