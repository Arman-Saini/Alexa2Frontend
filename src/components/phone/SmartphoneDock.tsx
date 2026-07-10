import { useTourStore } from '../../store/tourStore';
import { SmartphoneWidget } from './SmartphoneWidget';

/**
 * Thin positioning wrapper — SmartphoneWidget itself is untouched aside from
 * the forceExpandSignal prop added in Task 8. Its own isMinimized state is
 * still the source of truth for collapsed/expanded; this just forwards a
 * one-way "please open" nudge from the tour (see tourStore.isDockExpanded),
 * which the tour sets at the start of beat 3 and the user can still
 * collapse again afterward.
 */
export function SmartphoneDock() {
  const isDockExpanded = useTourStore((s) => s.isDockExpanded);

  return (
    <div style={{ pointerEvents: 'auto' }}>
      <SmartphoneWidget
        showExitButton={false}
        forceExpandSignal={isDockExpanded ? Date.now() : undefined}
      />
    </div>
  );
}

export default SmartphoneDock;
