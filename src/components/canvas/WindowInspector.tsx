import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import _layoutInit from '../../constants/anchorLayout.json';

type WindowDef = {
  id: string;
  anchor: { wall: string; along: number };
};

function findWindow(id: string): { win: WindowDef; roomId: string } | null {
  for (const [roomId, roomDef] of Object.entries(_layoutInit.rooms)) {
    const windows = (roomDef as { windows?: WindowDef[] }).windows;
    const found = windows?.find(w => w.id === id);
    if (found) return { win: found, roomId };
  }
  return null;
}

// ── Design tokens (matching DoorInspector) ────────────────────────────────────
const IW = {
  bg:        '#111111',
  surface:   '#1A1A1A',
  card:      '#242424',
  border:    '#404040',
  text:      '#F0F0EE',
  muted:     '#888888',
  accent:    '#E8E8E6',
  accentDim: '#666664',
  highlight: '#F0F0EE',
};

function SliderRow({
  label, value, min, max, step = 0.005, unit = '', decimals = 3, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; decimals?: number; onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => { setDraft(value.toFixed(decimals)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commitEdit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '7px 0', borderBottom: `1px solid ${IW.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: IW.muted, fontFamily: 'Inter, sans-serif' }}>{label}</span>
        {editing ? (
          <input ref={inputRef} type="number" value={draft} min={min} max={max} step={step}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, textAlign: 'right', width: 72, borderRadius: 4, padding: '1px 4px', background: IW.card, color: IW.accent, border: `1px solid ${IW.accent}`, outline: 'none' }} />
        ) : (
          <button onClick={startEdit}
            style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: IW.accent, background: 'transparent', border: 'none', cursor: 'text' }}
            title="Click to type">
            {value.toFixed(decimals)}{unit}
          </button>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: IW.accent, cursor: 'pointer' }} />
    </div>
  );
}

const PANEL_W = 272;
const PANEL_H_EST = 320;

function clampPos(x: number, y: number) {
  const maxX = Math.max(0, window.innerWidth  - PANEL_W - 8);
  const maxY = Math.max(0, window.innerHeight - PANEL_H_EST - 8);
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
}

function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(() => clampPos(initial.x, initial.y));
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    const onResize = () => setPos(p => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos(clampPos(
        origin.current.px + (e.clientX - origin.current.mx),
        origin.current.py + (e.clientY - origin.current.my),
      ));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return { pos, setPos, onMouseDown };
}

export function WindowInspector() {
  const selectedWindowId = useAppStore(s => s.selectedWindowId);
  const windowOverrides   = useAppStore(s => s.windowOverrides);
  const setSelectedWindow  = useAppStore(s => s.setSelectedWindow);
  const updateWindowOverride = useAppStore(s => s.updateWindowOverride);
  const resetWindowOverride  = useAppStore(s => s.resetWindowOverride);

  const { pos, setPos, onMouseDown } = useDraggable({
    x: window.innerWidth  - PANEL_W - 20,
    y: window.innerHeight - PANEL_H_EST - 20,
  });

  useEffect(() => {
    if (selectedWindowId) setPos(p => clampPos(p.x, p.y));
  }, [selectedWindowId]);

  if (!selectedWindowId) return null;
  const found = findWindow(selectedWindowId);
  if (!found) return null;

  const { win, roomId } = found;
  const ov = windowOverrides[selectedWindowId] ?? {};

  const along       = ov.along       ?? win.anchor.along;
  const maskW       = ov.maskW       ?? 1.5;
  const maskH       = ov.maskH       ?? 1.2;
  const yBottom     = ov.yBottom     ?? 0.9;
  const maskEnabled = ov.maskEnabled ?? false;

  const patch = (p: { along?: number; maskW?: number; maskH?: number; yBottom?: number; maskEnabled?: boolean }) =>
    updateWindowOverride(selectedWindowId, p);

  const hasOverrides = Object.keys(ov).length > 0;
  const panelMaxH = window.innerHeight - pos.y - 8;

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: PANEL_W, maxHeight: panelMaxH, overflowY: 'auto',
        zIndex: 9997,
        background: IW.bg,
        border: `1px solid ${IW.border}`,
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <div onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: `1px solid ${IW.border}`,
          cursor: 'grab', position: 'sticky', top: 0, background: IW.bg, zIndex: 1,
        }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: IW.text, fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: '0.01em' }}>
            Window
          </p>
          <p style={{ fontSize: 10, color: IW.muted, marginTop: 2 }}>{selectedWindowId} · {roomId}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onMouseDown={e => e.stopPropagation()}>
          {hasOverrides && (
            <button onClick={() => resetWindowOverride(selectedWindowId)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer' }}>
              Reset
            </button>
          )}
          <button onClick={() => setSelectedWindow(null)}
            style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '4px 14px' }} onMouseDown={e => e.stopPropagation()}>
        <SliderRow label="Along wall"   value={along}   min={0}   max={1}   step={0.005} decimals={3}       onChange={v => patch({ along: v })} />

        {/* Masking toggle — off by default, opt-in like doors */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Wall masking</span>
          <button
            onClick={() => patch({ maskEnabled: !maskEnabled })}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              background: maskEnabled ? '#00BFFF22' : 'transparent',
              color: maskEnabled ? '#00BFFF' : '#6B7280',
              border: `1px solid ${maskEnabled ? '#00BFFF66' : '#374151'}`,
              fontWeight: maskEnabled ? 600 : 400,
            }}
          >
            {maskEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {maskEnabled && (
          <>
            <SliderRow label="Sill height"  value={yBottom} min={0}   max={2.0} step={0.01}  decimals={2} unit="m" onChange={v => patch({ yBottom: v })} />
            <SliderRow label="Opening h"    value={maskH}   min={0.3} max={2.5} step={0.01}  decimals={2} unit="m" onChange={v => patch({ maskH: v })} />
            <SliderRow label="Opening w"    value={maskW}   min={0.5} max={3.0} step={0.01}  decimals={2} unit="m" onChange={v => patch({ maskW: v })} />
          </>
        )}
      </div>

      {/* Copy JSON */}
      <div style={{ padding: '4px 14px 12px', position: 'sticky', bottom: 0, background: IW.bg }} onMouseDown={e => e.stopPropagation()}>
        <button
          onClick={() => {
            const out = {
              along:   Number(along.toFixed(3)),
              yBottom: Number(yBottom.toFixed(2)),
              maskH:   Number(maskH.toFixed(2)),
              maskW:   Number(maskW.toFixed(2)),
            };
            navigator.clipboard?.writeText(JSON.stringify(out, null, 2));
          }}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer',
          }}>
          Copy as JSON
        </button>
      </div>
    </div>
  );
}
