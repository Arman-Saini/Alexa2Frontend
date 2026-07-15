import type { Scenario, Stage } from './types';

interface PipelineGuideAvatarProps {
  scenario: Scenario;
  stage: Stage | null;
  stageIndex: number;
}

function routeLabel(stage: Stage | null): string {
  if (!stage) return 'MIC → PIPELINE';
  const names: Record<string | number, string> = {
    mic: 'MIC', device: 'DEVICE', cloud: 'CLOUD',
    0: 'T0', 1: 'T1', 2: 'ACT', 3: 'T2', 4: 'GUARD', 5: 'T3',
  };
  return stage.flowPath.map((node) => names[node]).join(' → ') || 'RESPONSE';
}

function guideCopy(scenario: Scenario, stage: Stage | null): string {
  if (!stage) return 'Choose a prompt to start focused trace.';
  if (scenario.id === 'storage-tour') {
    const copy: Record<string, string> = {
      'session-ram': 'Local session buffer. This clears after conversation.',
      'novel-reason': 'Novel request uses cloud reasoning once.',
      'cloud-history': 'Only event metadata enters durable cloud history.',
      'local-cache': 'Resolved meaning becomes local T2 cache entry.',
      'rule-candidate': 'Nightly learning drafts guarded rule candidate.',
      'promote-local': 'Approved rule moves down into local T0.',
      'local-replay': 'Same request now resolves locally, no cloud.',
      'storage-close': 'Lifecycle complete: RAM clears, learned rule remains.',
    };
    return copy[stage.id] ?? 'Follow one storage step at a time.';
  }
  if (stage.cameraPose === 'shell-open') return 'Shell opens. Watch active part only.';
  if (stage.cameraPose === 'splay-flat' || stage.cameraPose === 'blueprint') {
    return `Raised ${stage.tier} part owns this decision.`;
  }
  return 'Follow raised part. Read left card for why.';
}

/**
 * Fixed focus strip. Replaces roaming mini-Alexa on this dense presentation
 * page, avoiding overlap with the main model, phone, narration card, and HUD.
 */
export function PipelineGuideAvatar({ scenario, stage, stageIndex }: PipelineGuideAvatarProps) {
  return (
    <aside
      aria-live="polite"
      aria-label="Pipeline focus guide"
      className="pointer-events-none fixed left-1/2 top-[74px] z-40 hidden w-[min(360px,36vw)] -translate-x-1/2 lg:block"
    >
      <div
        className="rounded-full border px-4 py-2 shadow-lg"
        style={{
          background: 'rgba(18, 16, 14, 0.92)',
          borderColor: `${scenario.accent}80`,
          color: '#f2ece5',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between gap-3 font-mono text-[8px] font-bold tracking-[0.15em]" style={{ color: scenario.accent }}>
          <span>{scenario.id === 'storage-tour' ? `MEMORY STEP ${stageIndex + 1}/8` : 'LOOK AT RAISED PART'}</span>
          <span>{routeLabel(stage)}</span>
        </div>
        <p className="mt-1 text-center font-display text-xs font-bold leading-snug">{guideCopy(scenario, stage)}</p>
      </div>
    </aside>
  );
}

export default PipelineGuideAvatar;
