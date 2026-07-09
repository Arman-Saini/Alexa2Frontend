import type { AppStoreModule } from '../../api/appStoreApi';
import { ScrollReveal } from '../shared/ScrollReveal';
import { ModuleCartridge, type EcosystemModule } from './ModuleCartridge';

export interface MockIntegration {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ModuleRingProps {
  realModules: AppStoreModule[];
  mockModules: MockIntegration[];
}

function fromReal(m: AppStoreModule): EcosystemModule {
  return {
    id: m.module_id,
    name: m.name,
    category: m.category,
    description: m.description || `${m.device_type} integration for ${m.brand ?? 'connected'} devices.`,
    status: 'live',
    author: m.verified ? `Verified · ${m.author}` : m.author,
  };
}

function fromMock(m: MockIntegration): EcosystemModule {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    description: m.description,
    status: 'concept',
    author: 'Concept — not connected',
  };
}

/**
 * Responsive grid of real + mock modules normalized into a single card
 * shape. A literal ring layout isn't worth the CSS cost here — a clean
 * cascading grid reveal reads just as deliberate.
 */
export function ModuleRing({ realModules, mockModules }: ModuleRingProps) {
  const cards: EcosystemModule[] = [
    ...realModules.map(fromReal),
    ...mockModules.map(fromMock),
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--space-6)',
      }}
    >
      {cards.map((card, i) => (
        <ScrollReveal key={card.id} delay={Math.min(i, 8) * 0.06}>
          <ModuleCartridge module={card} />
        </ScrollReveal>
      ))}
    </div>
  );
}
