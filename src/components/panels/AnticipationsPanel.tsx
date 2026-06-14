import { useAnticipations, useDigitalTwin, useSimulateMode } from '../../hooks/useBackendApi';
import type { Anticipation } from '../../hooks/useBackendApi';

const TIER_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  T0: { label: 'T0', color: '#4ADE80', bg: '#0A2A14' },
  T1: { label: 'T1', color: '#60A5FA', bg: '#0A1A2A' },
  T3: { label: 'T3', color: '#F59E0B', bg: '#2A1A00' },
};

const MODE_COLORS: Record<string, string> = {
  normal: '#00A8E0',
  festival: '#FF6B35',
  guest: '#9B59B6',
  sleep: '#34495E',
  away: '#E74C3C',
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_BADGE[tier] ?? { label: tier, color: '#888', bg: '#222' };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0"
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}33` }}
    >
      {style.label}
    </span>
  );
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct > 75 ? '#4ADE80' : pct > 50 ? '#F59E0B' : '#F87171';
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[9px] font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function AnticipationCard({ item }: { item: Anticipation }) {
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border"
      style={{ background: '#121218', borderColor: '#2A2A36' }}
    >
      <div className="flex items-start gap-2 justify-between">
        <p className="text-xs font-semibold text-white leading-tight flex-1">{item.action}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <TierBadge tier={item.tier} />
          <ConfidenceDot confidence={item.confidence} />
        </div>
      </div>
      <p className="text-[10px] text-[#8A8A8A] leading-relaxed">{item.reason}</p>
      {item.trigger_window && (
        <p className="text-[9px] text-[#555] mt-0.5">⏰ {item.trigger_window}</p>
      )}
    </div>
  );
}

function TwinModePill({ mode }: { mode: string }) {
  const color = MODE_COLORS[mode] ?? '#00A8E0';
  const labels: Record<string, string> = {
    normal: '🏠 Normal',
    festival: '🎉 Festival',
    guest: '👥 Guest',
    sleep: '😴 Sleep',
    away: '🚪 Away',
  };
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
      style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {labels[mode] ?? mode}
    </div>
  );
}

export function AnticipationsPanel() {
  const { anticipations, loading, error: anticipationsError, refetch } = useAnticipations();
  const { twinData } = useDigitalTwin();
  const simulate = useSimulateMode();

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Digital twin mode */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
        style={{ background: '#0D0D18', borderColor: '#2A2A36' }}
      >
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-1">
            Digital Twin Mode
          </p>
          {twinData ? (
            <TwinModePill mode={twinData.current_mode} />
          ) : (
            <span className="text-[10px] text-[#555]">Connecting to backend…</span>
          )}
        </div>
        {twinData?.mode_info && (
          <p className="text-[10px] text-[#8A8A8A] max-w-[120px] text-right leading-relaxed">
            {twinData.mode_info.description}
          </p>
        )}
      </div>

      {/* Simulate buttons */}
      <div>
        <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold mb-2 px-1">
          Simulate Events
        </p>
        <div className="flex flex-col gap-1.5">
          {(
            [
              { id: 'studyMode', emoji: '📚', label: 'Study Mode' },
              { id: 'nightSafetyCheck', emoji: '🌙', label: 'Night Safety' },
              { id: 'powerCut', emoji: '⚡', label: 'Power Cut' },
            ] as const
          ).map(({ id, emoji, label }) => (
            <button
              key={id}
              onClick={() => simulate(id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all hover:opacity-80 active:scale-95"
              style={{
                background: '#1A1A26',
                border: '1px solid #2A2A36',
                color: '#A0A0C0',
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span className="ml-auto text-[9px] text-[#555]">T0</span>
            </button>
          ))}
        </div>
      </div>

      {/* Anticipations */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold">
            AI Anticipations
          </p>
          <button
            onClick={refetch}
            disabled={loading}
            className="text-[9px] text-[#555] hover:text-[#8A8A8A] transition-colors disabled:opacity-40"
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>

        {anticipationsError && (
          <div className="text-[10px] text-[#F87171] px-1 mb-1">{anticipationsError}</div>
        )}
        {anticipations.length === 0 && !loading && (
          <div
            className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border"
            style={{ background: '#0D0D18', borderColor: '#2A2A36' }}
          >
            <span className="text-2xl">🧠</span>
            <p className="text-[10px] text-[#555] text-center">
              No anticipations yet.
              <br />
              Start the backend to see AI predictions.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {anticipations.map((item, i) => (
            <AnticipationCard key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
