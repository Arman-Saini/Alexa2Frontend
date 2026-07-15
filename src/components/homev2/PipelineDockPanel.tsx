// Self-contained, collapsible floating "side window" that mounts the
// embeddable <PipelineDemo mode="embedded"/> in a bounded, positioned box.
// Mirrors the contract described in PIPELINE_DEMO.md's "future /cartoon
// merge notes": the host (this panel) owns placement/sizing entirely, and
// unmounts PipelineDemo (rather than hiding it with CSS) whenever it isn't
// visible, so its WebGL context is released instead of accumulating.
//
// Purely presentational/controlled: all state (open/closed, play requests)
// is owned by the parent page (see WD, `/main-v2`). This component never
// reads or mutates anything outside its own tree.
import type { CSSProperties } from 'react';
import { PipelineDemo } from '../final/pipeline/PipelineDemo';
import type { Scenario, Stage } from '../final/pipeline/types';

export interface PipelineDockPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playRequest?: { scenarioId: Scenario['id']; token: number };
  onStageChange?: (e: { scenarioId: string; stageIndex: number; stage: Stage }) => void;
  onScenarioEnd?: (scenarioId: string) => void;
}

// Anchored top-right, below the page header. Sits above SmartphoneDock
// (bottom-left, z-40) and CartoonHudAvatar (bottom-right, z-45) — this panel
// lives in a different screen region than either, but is given a slightly
// higher z-index per spec so it always wins if anything ever overlaps.
const ANCHOR_STYLE: CSSProperties = {
  position: 'fixed',
  top: 72,
  right: 24,
  zIndex: 46,
};

const VOID_BG = 'rgba(9, 9, 9, 0.92)';
const COPPER_BORDER = '#4a4137';

export function PipelineDockPanel({
  open,
  onOpenChange,
  playRequest,
  onStageChange,
  onScenarioEnd,
}: PipelineDockPanelProps) {
  if (!open) {
    return (
      <div style={ANCHOR_STYLE}>
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: '#D9A98A',
            background: VOID_BG,
            border: `1px solid ${COPPER_BORDER}`,
            borderRadius: 999,
            padding: '8px 14px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          ▶ PIPELINE
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        ...ANCHOR_STYLE,
        width: 'min(46vw, 480px)',
        background: VOID_BG,
        border: `1px solid ${COPPER_BORDER}`,
        borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Slim header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: `1px solid ${COPPER_BORDER}`,
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.08em',
            color: '#B8AFA4',
          }}
        >
          LIVE PIPELINE
        </span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Collapse pipeline panel"
          style={{
            fontFamily: 'inherit',
            fontSize: 12,
            color: '#7A7168',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Demo mount area: positioned parent with explicit dimensions, as
          required by PipelineDemo's embedded mode (absolute inset-0). Only
          rendered while `open` — collapsing this panel unmounts
          PipelineDemo entirely, freeing its WebGL context. */}
      <div style={{ position: 'relative', width: '100%', height: 340 }}>
        <PipelineDemo
          mode="embedded"
          showPhone={false}
          loop={false}
          playRequest={playRequest}
          onStageChange={onStageChange}
          onScenarioEnd={onScenarioEnd}
        />
      </div>
    </div>
  );
}
