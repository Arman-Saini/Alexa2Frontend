// AppStorePanel , browse and install MCP modules from the backend.
// Shows verified modules with safety class, install button, and extra T0 rules count.

import { useState } from 'react';
import { C, F } from './ScenarioDefs';
import type { AppStoreModule } from '../../api';

const SAFETY_COLORS: Record<string, string> = {
  CRITICAL:    C.red,
  STANDARD:    C.amber,
  CONVENIENCE: C.green,
};

function SafetyBadge({ cls }: { cls?: string }) {
  if (!cls) return null;
  const color = SAFETY_COLORS[cls] ?? C.text3;
  return (
    <span style={{
      fontSize: F.badge, padding: '1px 5px', borderRadius: 3,
      background: `${color}18`, border: `1px solid ${color}44`, color,
      fontWeight: 700, letterSpacing: '0.06em',
    }}>{cls}</span>
  );
}

interface ModuleCardProps {
  module:      AppStoreModule;
  onInstall:   () => Promise<void>;
}

function ModuleCard({ module: m, onInstall }: ModuleCardProps) {
  const [installing, setInstalling] = useState(false);
  const [installed,  setInstalled]  = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try { await onInstall(); setInstalled(true); }
    catch { /* show nothing extra */ }
    finally { setInstalling(false); }
  };

  return (
    <div style={{
      background: C.card, border: `1px solid ${installed ? C.greenDim : C.border}`,
      borderRadius: 6, padding: '9px 10px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: F.xs, fontWeight: 700, color: C.text }}>{m.name}</span>
            {m.verified && (
              <span style={{ fontSize: F.badge, color: C.cyan, background: `${C.cyan}18`, border: `1px solid ${C.cyanDim}`, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>✓ VERIFIED</span>
            )}
            <SafetyBadge cls={m.safety_class} />
          </div>
          <div style={{ fontSize: F.tiny, color: C.text3, marginBottom: 4, lineHeight: 1.5 }}>
            {m.brand && <><span style={{ color: C.text2 }}>{m.brand}</span> · </>}
            {m.device_type.replace(/_/g, ' ')}
            {m.auto_t0_rules && m.auto_t0_rules.length > 0 && (
              <span style={{ color: C.green, marginLeft: 6 }}>+{m.auto_t0_rules.length} T0 rules</span>
            )}
          </div>
          {m.description && (
            <div style={{ fontSize: F.badge, color: C.text3, lineHeight: 1.5 }}>
              {m.description.substring(0, 80)}
            </div>
          )}
        </div>
        <button
          onClick={handleInstall}
          disabled={installing || installed}
          style={{
            fontSize: F.badge, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
            background: installed ? C.greenBg : installing ? C.card : C.cyanBg,
            border: `1px solid ${installed ? C.greenDim : installing ? C.border : C.cyanDim}`,
            color: installed ? C.green : installing ? C.text3 : C.cyan,
            cursor: installing || installed ? 'default' : 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap' as const,
          }}
        >
          {installed ? '✓ Done' : installing ? '…' : 'Install'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  modules:     AppStoreModule[];
  onInstall:   (moduleId: string) => Promise<void>;
  connected:   boolean;
}

export function AppStorePanel({ modules, onInstall, connected }: Props) {
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState<'all' | 'verified'>('verified');

  const filtered = modules.filter(m => {
    if (filter === 'verified' && !m.verified) return false;
    if (query) {
      const q = query.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.device_type.toLowerCase().includes(q) || (m.brand ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text }}>App Store</div>
            <div style={{ fontSize: F.tiny, color: C.text3 }}>{modules.length} modules available</div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['all', 'verified'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: F.badge, fontWeight: 600, padding: '3px 8px', borderRadius: 3,
                  background: filter === f ? C.cyanBg : C.card,
                  border: `1px solid ${filter === f ? C.cyanDim : C.border}`,
                  color: filter === f ? C.cyan : C.text3,
                  cursor: 'pointer', textTransform: 'capitalize' as const,
                }}
              >{f}</button>
            ))}
          </div>
        </div>
        <input
          placeholder="Search modules…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            fontSize: F.xs, padding: '5px 8px', borderRadius: 4,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.text, outline: 'none',
          }}
        />
      </div>

      {/* Module list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {!connected ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.text3, fontSize: F.xs }}>
            Backend offline , modules unavailable
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.text3, fontSize: F.xs }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
            No modules match.
          </div>
        ) : (
          filtered.map(m => (
            <ModuleCard
              key={m.module_id}
              module={m}
              onInstall={() => onInstall(m.module_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
