import { CartoonHudAvatar } from '../cartoon/CartoonHudAvatar';
import { SmartphoneDock } from '../phone/SmartphoneDock';

/**
 * Bottom-right persistent chrome over the digital twin: the cartoon avatar
 * sits just above the collapsible phone, both driven by tourStore. This is
 * the only thing ActShell mounts on top of the twin besides ActNav and the
 * lens panel — PhoneMockup/DemoControls no longer render here (see
 * ActShell.tsx diff), though those files still exist untouched.
 */
export function HudDock() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 'var(--space-3)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <CartoonHudAvatar />
      </div>
      <SmartphoneDock />
    </div>
  );
}

export default HudDock;
