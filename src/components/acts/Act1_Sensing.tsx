import { ScrollReveal } from '../shared/ScrollReveal';
import { GlassCard } from '../shared/GlassCard';

interface SensingSection {
  headline: string;
  body: string;
}

const SECTIONS: SensingSection[] = [
  {
    headline: 'Every room reports state continuously',
    body: 'Living room, kitchen, bathroom, office, and bedroom each stream their own telemetry — lights, fans, locks, and thermostats all check in, not just when something changes.',
  },
  {
    headline: 'Presence and motion draw the shape of a day',
    body: 'Motion sensors and door contacts turn footsteps and open doors into a live picture of where people are, so the house knows the difference between empty and quiet.',
  },
  {
    headline: 'Environment readings feed a shared context',
    body: 'Temperature, humidity, air quality, and power draw from devices like the kitchen thermostat and smart plug are pooled into one context, not read in isolation.',
  },
  {
    headline: 'Safety signals get first priority',
    body: 'Smoke detectors, doorbells, and grid-health readings are sensed on the same stream as everything else — but weighted to reach the brain fastest.',
  },
];

/**
 * Act 1 — narrates how Hearth senses the home. Scroll-content act;
 * each section reveals on scroll via ScrollReveal.
 */
export function Act1_Sensing() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-24) var(--space-8) var(--space-24)',
        gap: 'var(--space-6)',
      }}
    >
      <ScrollReveal>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            margin: 0,
            maxWidth: 640,
          }}
        >
          The sensing layer
        </h2>
      </ScrollReveal>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-6)',
          maxWidth: 960,
          width: '100%',
          marginTop: 'var(--space-8)',
        }}
      >
        {SECTIONS.map((section, i) => (
          <ScrollReveal key={section.headline} delay={i * 0.08}>
            <GlassCard padding="md">
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)',
                  margin: 0,
                  marginBottom: 'var(--space-2)',
                }}
              >
                {section.headline}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {section.body}
              </p>
            </GlassCard>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
