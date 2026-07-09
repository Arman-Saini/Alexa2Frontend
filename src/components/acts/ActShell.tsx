import { AnimatePresence, motion } from 'framer-motion';
import { useActStore } from '../../store/actStore';
import { useScenarioPlan } from '../../hooks/useScenarioPlan';
import { LensPanel, DemoControls } from '../shared';
import { ActNav } from './ActNav';
import { Act0_Resting } from './Act0_Resting';
import { Act1_Sensing } from './Act1_Sensing';
import { Act2_CentralBrain } from './Act2_CentralBrain';
import { Act2_TraceReadout } from './Act2_TraceReadout';
import { Act3_ScenarioWalkthrough } from './Act3_ScenarioWalkthrough';
import { Act3_StepDiagram } from './Act3_StepDiagram';
import { PhoneMockup } from '../phone/PhoneMockup';
import { PhoneTraceReadout } from '../phone/PhoneTraceReadout';
import { ModuleCartridge } from '../ecosystem/ModuleCartridge';

const ACT_TRANSITION = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Top-level Z-depth Act sequence shell. Mounted over the persistent 3D house
 * canvas (rendered elsewhere, as a background layer). Only one Act's UI is
 * visible at a time; transitions between them simulate Z-depth via
 * scale/blur/opacity since there is no real camera dolly.
 */
export function ActShell() {
  const currentAct = useActStore((s) => s.currentAct);
  const lensPanel = useActStore((s) => s.lensPanel);
  const closeLens = useActStore((s) => s.closeLens);
  const triggerContext = useActStore((s) => s.triggerContext);
  const { plan, loading } = useScenarioPlan();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>
        <ActNav />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentAct}
          initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
          transition={ACT_TRANSITION}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
        >
          {currentAct === 0 && <Act0_Resting />}
          {currentAct === 1 && <Act1_Sensing />}
          {currentAct === 2 && <Act2_CentralBrain />}
          {currentAct === 3 && (
            <Act3_ScenarioWalkthrough plan={plan} loading={loading} />
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ pointerEvents: 'auto' }}>
        <LensPanel
          open={lensPanel.open}
          onClose={closeLens}
          originPoint={lensPanel.originPoint ?? undefined}
          variant={lensPanel.variant ?? undefined}
          size="md"
        >
          {lensPanel.variant === 'brain' && <Act2_TraceReadout />}
          {lensPanel.variant === 'scenario' && (
            <Act3_StepDiagram plan={plan} loading={loading} />
          )}
          {lensPanel.variant === 'phone' && <PhoneTraceReadout />}
          {lensPanel.variant === 'module' && triggerContext?.module && (
            <ModuleCartridge module={triggerContext.module} />
          )}
        </LensPanel>
      </div>

      {/* Floating interactive mode HUD overlays */}
      <div style={{ pointerEvents: 'auto' }}>
        <PhoneMockup />
        <DemoControls />
      </div>
    </div>
  );
}
