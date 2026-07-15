import type { Stage } from './types';

interface StorageGraphProps {
  stageIndex: number;
  stage: Stage | null;
}

type NodeId = 'ram' | 'reason' | 'history' | 'cache' | 'rule';

const NODES: { id: NodeId; x: number; y: number; title: string; color: string }[] = [
  { id: 'ram', x: 82, y: 205, title: 'RAM', color: '#62dcff' },
  { id: 'reason', x: 255, y: 84, title: 'T3', color: '#ff6b6b' },
  { id: 'history', x: 458, y: 84, title: 'HISTORY', color: '#9daeff' },
  { id: 'cache', x: 458, y: 292, title: 'T2', color: '#e9b44c' },
  { id: 'rule', x: 255, y: 372, title: 'T0', color: '#3bf574' },
];

const EDGES: { from: NodeId; to: NodeId; visibleAt: number }[] = [
  { from: 'ram', to: 'reason', visibleAt: 1 },
  { from: 'reason', to: 'history', visibleAt: 2 },
  { from: 'history', to: 'cache', visibleAt: 3 },
  { from: 'cache', to: 'rule', visibleAt: 5 },
];

function activeNode(stageIndex: number): NodeId {
  if (stageIndex === 0) return 'ram';
  if (stageIndex === 1 || stageIndex === 4) return 'reason';
  if (stageIndex === 2) return 'history';
  if (stageIndex === 3) return 'cache';
  return 'rule';
}

/**
 * Storage tour uses one stable graph, not a second scattered 3D sequence.
 * Nodes persist while edges and counts grow, giving viewer one visual model.
 */
export function StorageGraph({ stageIndex, stage }: StorageGraphProps) {
  const active = activeNode(stageIndex);
  const visibleNodes = new Set<NodeId>(['ram']);
  if (stageIndex >= 1) visibleNodes.add('reason');
  if (stageIndex >= 2) visibleNodes.add('history');
  if (stageIndex >= 3) visibleNodes.add('cache');
  if (stageIndex >= 5) visibleNodes.add('rule');
  const byId = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<NodeId, (typeof NODES)[number]>;

  return (
    <section
      aria-live="polite"
      aria-label="Memory lifecycle graph"
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 hidden w-[580px] max-w-[58vw] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      <div className="rounded-3xl border border-white/15 bg-[#0d0d10]/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-[#e9b44c]">MEMORY LIFECYCLE</div>
            <h2 className="mt-1 font-display text-lg font-bold text-white">One request becomes local knowledge</h2>
          </div>
          <span className="rounded-full border border-white/15 px-2 py-1 font-mono text-[9px] text-white/65">STEP {stageIndex + 1}/8</span>
        </div>

        <svg viewBox="0 0 540 430" className="mt-2 block w-full" role="img" aria-label="Growing graph of local and cloud storage">
          <defs>
            <marker id="storage-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#d6cec3" />
            </marker>
          </defs>
          {EDGES.map((edge) => {
            const from = byId[edge.from];
            const to = byId[edge.to];
            const visible = stageIndex >= edge.visibleAt;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={visible ? '#d6cec3' : '#3a3734'}
                strokeWidth="2"
                strokeDasharray={visible ? '0' : '5 7'}
                markerEnd="url(#storage-arrow)"
              />
            );
          })}
          {NODES.map((node) => {
            const visible = visibleNodes.has(node.id);
            const isActive = node.id === active;
            return (
              <g key={node.id} opacity={visible ? 1 : 0.24} style={{ transition: 'opacity 400ms ease' }}>
                {isActive && <circle cx={node.x} cy={node.y} r="49" fill={node.color} opacity="0.14" className="animate-pulse" />}
                <circle cx={node.x} cy={node.y} r="37" fill="#18181d" stroke={node.color} strokeWidth={isActive ? 3.5 : 1.5} />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#f5f2ec" fontSize={node.title === 'HISTORY' ? '8' : '12'} fontWeight="700">{node.title}</text>
              </g>
            );
          })}
          {stageIndex >= 4 && (
            <g>
              <rect x="334" y="334" width="184" height="60" rx="10" fill="#17191d" stroke={stageIndex >= 5 ? '#3bf574' : '#ff6b6b'} strokeWidth="1.5" />
              <text x="348" y="351" fill="#ded7cf" fontSize="8" fontWeight="700">RULE SET</text>
              <text x="348" y="369" fill={stageIndex >= 5 ? '#3bf574' : '#ffbf7a'} fontSize="9" fontWeight="700">
                + bedtime_lighting
              </text>
              <text x="348" y="383" fill="#a9a19a" fontSize="8">
                {stageIndex === 4 ? 'candidate queued' : stageIndex === 5 ? 'compiled locally' : 'compiled · matches: 1'}
              </text>
            </g>
          )}
        </svg>

        <p className="border-t border-white/10 pt-3 text-center text-xs leading-relaxed text-white/70">
          {stage?.body}
        </p>
      </div>
    </section>
  );
}

export default StorageGraph;
