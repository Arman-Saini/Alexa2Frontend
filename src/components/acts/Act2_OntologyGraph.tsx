import { motion } from 'framer-motion';

// Hand-composed 3-tier ontology visualization: Entity -> State -> Environment.
// This mirrors real broker-style context reasoning (OWL/SWRL-ish context
// brokers): a raw sensor reading resolves to a recognized Entity, which
// carries a State, which contributes to a higher-level Environment inference.
// Deliberately NOT a physics/d3-force layout — coordinates are fixed.

interface GraphNode {
  id: string;
  tier: 'entity' | 'state' | 'environment';
  label: string;
  x: number;
  y: number;
}

const NODES: GraphNode[] = [
  // Entity tier — raw recognized devices/signals
  { id: 'kt-thermo', tier: 'entity', label: 'Kitchen Thermostat', x: 110, y: 60 },
  { id: 'ba-geyser', tier: 'entity', label: 'Bathroom Geyser', x: 300, y: 60 },
  { id: 'lr-motion', tier: 'entity', label: 'Living Room Motion', x: 490, y: 60 },
  { id: 'hw-doorbell', tier: 'entity', label: 'Front Doorbell', x: 680, y: 60 },

  // State tier — recognized states
  { id: 'st-heat', tier: 'state', label: 'High Heat', x: 110, y: 210 },
  { id: 'st-water', tier: 'state', label: 'Water Heating', x: 300, y: 210 },
  { id: 'st-presence', tier: 'state', label: 'Presence Detected', x: 490, y: 210 },
  { id: 'st-door', tier: 'state', label: 'Someone At Door', x: 680, y: 210 },

  // Environment tier — inferred context
  { id: 'env-cooking', tier: 'environment', label: 'Cooking In Progress', x: 205, y: 360 },
  { id: 'env-bathroom', tier: 'environment', label: 'Bathroom Occupied Soon', x: 300, y: 360 },
  { id: 'env-guest', tier: 'environment', label: 'Guest Arriving', x: 585, y: 360 },
];

const EDGES: [string, string][] = [
  ['kt-thermo', 'st-heat'],
  ['ba-geyser', 'st-water'],
  ['lr-motion', 'st-presence'],
  ['hw-doorbell', 'st-door'],

  ['st-heat', 'env-cooking'],
  ['st-water', 'env-bathroom'],
  ['st-presence', 'env-guest'],
  ['st-door', 'env-guest'],
];

const TIER_COLOR: Record<GraphNode['tier'], string> = {
  entity: 'var(--text-secondary)',
  state: 'var(--copper-500)',
  environment: 'var(--ember-500)',
};

const TIER_FONT: Record<GraphNode['tier'], string> = {
  entity: 'var(--font-mono)',
  state: 'var(--font-mono)',
  environment: 'var(--font-display)',
};

function findNode(id: string): GraphNode {
  const node = NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown ontology node: ${id}`);
  return node;
}

/**
 * Static/lightly-animated SVG showing the Entity -> State -> Environment
 * ontology chain. Hand-composed layout, not a force simulation.
 */
export function Act2_OntologyGraph() {
  return (
    <svg
      viewBox="0 0 800 420"
      width="100%"
      height="100%"
      style={{ maxWidth: 860, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="Ontology graph showing devices resolving into states and environment inferences"
    >
      {/* Tier labels */}
      <text x="20" y="30" fill="var(--text-tertiary)" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.08em">
        ENTITY
      </text>
      <text x="20" y="180" fill="var(--text-tertiary)" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.08em">
        STATE
      </text>
      <text x="20" y="330" fill="var(--text-tertiary)" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.08em">
        ENVIRONMENT
      </text>

      {/* Edges */}
      {EDGES.map(([fromId, toId], i) => {
        const from = findNode(fromId);
        const to = findNode(toId);
        return (
          <line
            key={`${fromId}-${toId}`}
            x1={from.x}
            y1={from.y + 14}
            x2={to.x}
            y2={to.y - 14}
            stroke="var(--copper-700)"
            strokeWidth={1.5}
            opacity={0.5}
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="3.2s"
              begin={`${i * 0.25}s`}
              repeatCount="indefinite"
            />
          </line>
        );
      })}

      {/* Traveling signal pulse along the cooking chain */}
      <motion.circle
        r={3.5}
        fill="var(--ember-500)"
        animate={{
          cx: [110, 110, 205, 205],
          cy: [60, 210, 210, 360],
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
      />

      {/* Nodes */}
      {NODES.map((node, i) => (
        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
          <motion.circle
            r={5}
            fill={TIER_COLOR[node.tier]}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
          <circle r={11} fill="none" stroke={TIER_COLOR[node.tier]} strokeWidth={1} opacity={0.25} />
          <text
            y={node.tier === 'entity' ? -20 : 30}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontFamily={TIER_FONT[node.tier]}
            fontSize={node.tier === 'environment' ? 12.5 : 11}
            fontWeight={node.tier === 'environment' ? 600 : 400}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
