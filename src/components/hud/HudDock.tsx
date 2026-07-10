import { CartoonHudAvatar } from '../cartoon/CartoonHudAvatar';
import { SmartphoneDock } from '../phone/SmartphoneDock';

/**
 * Phone docks bottom-left; cartoon avatar is a separate draggable layer
 * bottom-right (see CartoonHudAvatar's own drag handling) so it can roam
 * the viewport without fighting the phone's own fixed positioning.
 */
export function HudDock() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          left: 'var(--space-6)',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SmartphoneDock />
        </div>
      </div>
      <CartoonHudAvatar />
    </>
  );
}

export default HudDock;
