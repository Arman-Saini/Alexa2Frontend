import { useEffect, useState } from 'react';
import { useIsMobileViewport } from '../../hooks/useIsMobileViewport';
import { useInteractionEffects } from '../../hooks/useInteractionEffects';
import { AmbientBackdrop } from '../shared/AmbientBackdrop';
import { SmartphoneWidget } from '../phone/SmartphoneWidget';
import { DigitalTwinCanvas } from '../canvas/DigitalTwinCanvas';
import { ActShell } from '../acts/ActShell';
import { LaundryDoorbellDemo } from '../hud/LaundryDoorbellDemo';
import { FinanceReminderDemo } from '../hud/FinanceReminderDemo';
import { PipelineDockPanel } from './PipelineDockPanel';
import { usePipelineBridge, type PipelineBridgeRequest } from '../../store/pipelineBridge';
import { useTourStore } from '../../store/tourStore';
import { TIER_META, IO_COLOR } from '../final/pipeline/types';

// Byte-for-byte structural duplicate of App.tsx's `Home`, plus the
// PipelineDockPanel wiring on the desktop branch only (see WD). The mobile
// branch is intentionally left untouched — phone-only, no dock panel.
function HomeV2Page() {
  const isMobile = useIsMobileViewport();
  useInteractionEffects();

  const [open, setOpen] = useState(false);
  // The request currently pending playback. Distinct from the store's
  // `request` so a MANUAL reopen (pill click) can null it out and land on the
  // idle picker instead of replaying the last command's scenario (which would
  // otherwise re-fire on PipelineDemo's remount).
  const [pendingPlay, setPendingPlay] = useState<PipelineBridgeRequest | null>(null);
  const request = usePipelineBridge((s) => s.request);
  const setAvatarOverride = useTourStore((s) => s.setAvatarOverride);

  // Auto-open the dock and queue playback whenever a NEW resolved phone
  // command arrives (token increments even for repeated same-tier commands).
  useEffect(() => {
    if (request?.token !== undefined) {
      setPendingPlay(request);
      setOpen(true);
    }
  }, [request?.token]);

  if (isMobile) {
    // Real phone-width viewport: the phone app IS the whole experience —
    // no digital twin, no HUD, no "view 3D demo" toggle.
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#090909] select-none text-text-primary font-sans">
        <AmbientBackdrop />
        <div className="relative z-10 w-full h-full">
          <SmartphoneWidget showExitButton={false} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--void-950)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <DigitalTwinCanvas />
      </div>
      <ActShell />
      <LaundryDoorbellDemo />
      <FinanceReminderDemo />
      <PipelineDockPanel
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          // Manual reopen → start idle (no replay); collapse → drop the
          // avatar override so the HUD robot returns to its default mood.
          if (v) setPendingPlay(null);
          else setAvatarOverride(null);
        }}
        playRequest={pendingPlay ?? undefined}
        onStageChange={({ stage }) => {
          if (stage.tier === 'IO') {
            setAvatarOverride({
              expression: stage.expression ?? 'resting',
              ledColor: IO_COLOR,
              ledMode: 'solid',
            });
            return;
          }
          setAvatarOverride({
            expression: stage.expression ?? 'resting',
            ledColor: TIER_META[stage.tier].color,
            ledMode: 'pulse',
          });
        }}
        onScenarioEnd={() => setAvatarOverride(null)}
      />
    </div>
  );
}

export default HomeV2Page;
export { HomeV2Page };
