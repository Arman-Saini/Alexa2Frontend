import { useEffect, useRef, useState } from 'react';
import { animate, createSpring } from 'animejs';
import { useStoryStore, getActiveLayer, type StoryLayer } from '../../store/storyStore';
import { useActStore } from '../../store/actStore';
import { colors } from '../../theme/tokens';
import { GlassCard } from '../shared/GlassCard';

interface TierContent {
  label: string;
  title: string;
  desc: string;
  roomId: string;
  targetLatency: number;
  targetCost: number;
  techSpecs: string[];
}

const TIER_DATA: Record<StoryLayer, TierContent> = {
  hook: {
    label: 'Hearth Core',
    title: 'A house that understands itself.',
    desc: 'Hearth monitors room signals in real time, reasoning about events to act proactively before you even need to ask.',
    roomId: 'house',
    targetLatency: 20,
    targetCost: 0,
    techSpecs: ['Orthographic 3D Viewport', 'Real-time WebSocket State', 'Unified Event Bus'],
  },
  t0: {
    label: 'T0: Instant Edge Reflex',
    title: 'Executing rules locally in <2ms',
    desc: 'Senses environment changes and safety flags. If a motion sensor is triggered, the local rule engine executes instantly on-device.',
    roomId: 'kitchen',
    targetLatency: 1,
    targetCost: 0,
    techSpecs: ['Edge Broker: MQTT', 'No cloud roundtrip', 'Zero network overhead'],
  },
  t1: {
    label: 'T1: Local NLU Processing',
    title: 'Understanding intents offline',
    desc: 'When you speak, Hearth parses your words using a local Natural Language Understanding model to resolve room and device slots.',
    roomId: 'master-bedroom',
    targetLatency: 45,
    targetCost: 0,
    techSpecs: ['ONNX Slot Filling', 'Offline Intent Mapping', 'Contextual Room Matching'],
  },
  cache: {
    label: 'Semantic Cache Layer',
    title: 'Speeding up repetitive plans',
    desc: 'If a command requires complex reasoning but matches a previous pattern, Hearth retrieves the plan directly from the local Semantic Cache.',
    roomId: 'office',
    targetLatency: 8,
    targetCost: 0,
    techSpecs: ['Ember Vector Database', 'Semantic Similarity Search', 'Local Plan Validation'],
  },
  t3: {
    label: 'T3: Cloud Reasoning & Planning',
    desc: 'For highly complex scenarios, Hearth escalates to Bedrock. The Claude 3.5 supervisor coordinates specialised agents to build safety plans.',
    title: 'AWS Bedrock Agentic Escalation',
    roomId: 'bathroom',
    targetLatency: 1200,
    targetCost: 0.0004,
    techSpecs: ['Claude 3.5 Sonnet', 'Financial Safety Agent', 'Dynamic Device Planner'],
  },
  ecosystem: {
    label: 'The Connected Ecosystem',
    title: 'Plug-and-play integrations',
    desc: 'Third-party modules orbit the Hearth core seamlessly via Model Context Protocol, registering capabilities dynamically.',
    roomId: 'house',
    targetLatency: 15,
    targetCost: 0,
    techSpecs: ['MCP Server Spec', 'Bookkeeper Ledger Interface', 'Dynamic Tool Discovery'],
  },
};

export function SidePanel() {
  const progress = useStoryStore((s) => s.storyProgress);
  const activeLayer = getActiveLayer(progress);
  const content = TIER_DATA[activeLayer];

  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);

  const [latencyVal, setLatencyVal] = useState(0);
  const [costVal, setCostVal] = useState(0);

  // Trigger X-Ray sweep on layer change
  const prevLayerRef = useRef<StoryLayer | null>(null);
  useEffect(() => {
    if (activeLayer !== prevLayerRef.current) {
      prevLayerRef.current = activeLayer;
      const triggerXray = useActStore.getState().triggerXray;
      triggerXray(content.roomId, 'scenario');
    }
  }, [activeLayer, content.roomId]);

  // Spring entrance for the side panel on mount
  useEffect(() => {
    if (!panelRef.current) return;
    animate(panelRef.current, {
      translateX: ['-100%', '0%'],
      opacity: [0, 1],
      duration: 1000,
      ease: createSpring({ stiffness: 80, damping: 15 }),
    });
  }, []);

  // Stagger entry animations for headers & details whenever activeLayer changes
  useEffect(() => {
    if (headerRef.current?.children) {
      animate(Array.from(headerRef.current.children), {
        opacity: [0, 1],
        translateX: [-15, 0],
        delay: (_, i) => (i ?? 0) * 100,
        duration: 500,
        ease: 'outQuad',
      });
    }

    if (specsRef.current?.children) {
      animate(Array.from(specsRef.current.children), {
        opacity: [0, 1],
        scale: [0.9, 1],
        delay: (_, i) => (i ?? 0) * 80 + 300,
        duration: 400,
        ease: 'outBack',
      });
    }

    // Count up latency animation using animejs
    const latObj = { val: 0 };
    animate(latObj, {
      val: content.targetLatency,
      round: 1,
      duration: 800,
      ease: 'outQuad',
      update: () => setLatencyVal(latObj.val),
    });

    // Count up cost animation
    const costObj = { val: 0 };
    animate(costObj, {
      val: content.targetCost,
      duration: 800,
      ease: 'outQuad',
      update: () => setCostVal(costObj.val),
    });
  }, [activeLayer, content.targetLatency, content.targetCost]);

  const accentColor = activeLayer === 't0'
    ? colors.copper[500]
    : activeLayer === 't1'
    ? colors.ember[500]
    : activeLayer === 'cache'
    ? colors.ember[300]
    : colors.copper[300];

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: 'var(--space-6)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '380px',
        zIndex: 30,
        pointerEvents: 'auto',
        opacity: 0,
      }}
    >
      <GlassCard padding="lg" glow="none">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Label / Badge */}
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 'var(--r-full)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: accentColor,
                color: 'var(--void-950)',
              }}
            >
              {content.label}
            </span>
          </div>

          {/* Main Title & Description */}
          <div ref={headerRef} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(20px, 3.5vw, 24px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {content.title}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {content.desc}
            </p>
          </div>

          {/* Technical Specs List (Staggered Reveals) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
              TECHNICAL ENGINE SIGNALS
            </span>
            <div ref={specsRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {content.techSpecs.map((spec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    padding: '6px var(--space-3)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: accentColor }} />
                  {spec}
                </div>
              ))}
            </div>
          </div>

          {/* Real-time stats count up */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--r-md)',
              border: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-tertiary)', display: 'block' }}>
                LATENCY
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {latencyVal}ms
              </div>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-tertiary)', display: 'block' }}>
                COST (USD)
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ${costVal.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
