import { useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import { SmartphoneWidget } from './SmartphoneWidget';

/**
 * Thin positioning wrapper — SmartphoneWidget itself is untouched aside from
 * the forceExpandSignal prop added in Task 8. Its own isMinimized state is
 * still the source of truth for collapsed/expanded ("Interact with Alexa"
 * pill when minimized) — this just forwards a one-way "please open" nudge
 * from the tour (see tourStore.isDockExpanded), which the tour sets at the
 * start of beat 3 and the user can still collapse again afterward.
 *
 * We capture a stable timestamp the moment isDockExpanded flips to true so
 * that re-renders while it stays true don't repeatedly re-fire forceExpand
 * and fight against the user's manual collapse.
 */
export function SmartphoneDock() {
  const isDockExpanded = useTourStore((s) => s.isDockExpanded);
  // Capture a timestamp only at the moment isDockExpanded becomes true.
  // Using a ref so it doesn't cause a re-render on its own.
  const expandStampRef = useRef<number | undefined>(undefined);
  if (isDockExpanded && expandStampRef.current === undefined) {
    expandStampRef.current = Date.now();
  }
  if (!isDockExpanded) {
    expandStampRef.current = undefined;
  }

  return (
    <div style={{ pointerEvents: 'auto' }}>
      <SmartphoneWidget
        showExitButton={false}
        forceExpandSignal={expandStampRef.current}
      />
    </div>
  );
}

export default SmartphoneDock;
