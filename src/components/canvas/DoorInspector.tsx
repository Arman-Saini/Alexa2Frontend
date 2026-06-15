import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore, type DoorOverride } from '../../store/store';
import _layoutInit from '../../constants/anchorLayout.json';

type DoorDef = {
  id: string; model: string;
  anchor: { type: string; wall: string; along: number };
  swingDir?: number; distFromWall?: number; size?: number;
  maskWidth?: number; maskHeight?: number; maskAlong?: number;
};

let _layout = _layoutInit;
if (import.meta.hot) {
  import.meta.hot.accept('../../constants/anchorLayout.json', (mod) => {
    _layout = (mod as unknown as { default: typeof _layoutInit }).default;
  });
}

function findDoor(id: string): { door: DoorDef; roomId: string } | null {
  for (const [roomId, roomDef] of Object.entries(_layout.rooms)) {
    const doors = (roomDef as { doors?: DoorDef[] }).doors;
    const found = doors?.find(d => d.id === id);
    if (found) return { door: found, roomId };
  }
  return null;
}

// ── Yacht Club design tokens ──────────────────────────────────────────────────
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
            style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: IW.accent, background: 'transparent', border: 'none', cursor: 'text', textDecoration: 'none' }}
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
const PANEL_H_EST = 530;

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

export function DoorInspector() {
  const selectedDoorId = useAppStore(s => s.selectedDoorId);
  const doorOverrides = useAppStore(s => s.doorOverrides);
  const setSelectedDoor = useAppStore(s => s.setSelectedDoor);
  const updateDoorOverride = useAppStore(s => s.updateDoorOverride);
  const resetDoorOverride = useAppStore(s => s.resetDoorOverride);

  const { pos, setPos, onMouseDown } = useDraggable({
    x: window.innerWidth  - PANEL_W - 20,
    y: window.innerHeight - PANEL_H_EST - 20,
  });

  useEffect(() => {
    if (selectedDoorId) setPos(p => clampPos(p.x, p.y));
  }, [selectedDoorId]);

  if (!selectedDoorId) return null;
  const found = findDoor(selectedDoorId);
  if (!found) return null;

  const { door, roomId } = found;
  const ov = doorOverrides[selectedDoorId] ?? {};

  const wall     = (ov.wall      ?? door.anchor.wall) as 'W1' | 'W2' | 'W3' | 'W4';
  const along    = ov.along      ?? door.anchor.along;
  const dist     = ov.distFromWall ?? door.distFromWall ?? 0;
  const size     = ov.size       ?? door.size ?? 0.9;
  const swingDir = (ov.swingDir  ?? door.swingDir ?? 1) as 1 | -1;

  // Mask defaults: anchorLayout.json first, then overrides
  const maskWidth  = ov.maskWidth  ?? door.maskWidth  ?? 0;
  const maskHeight = ov.maskHeight ?? door.maskHeight ?? 0;
  const maskAlong  = ov.maskAlong  ?? door.maskAlong  ?? along;

  const patch = (p: Partial<DoorOverride>) => updateDoorOverride(selectedDoorId, p);
  const modelLabel = door.model.replace(/^(quat:|furn:)/, '');
  const wallLabels: Record<string, string> = { W1: 'N', W2: 'E', W3: 'S', W4: 'W' };

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
            {modelLabel}
          </p>
          <p style={{ fontSize: 10, color: IW.muted, marginTop: 2 }}>{selectedDoorId} · {roomId}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onMouseDown={e => e.stopPropagation()}>
          {Object.keys(ov).length > 0 && (
            <button onClick={() => resetDoorOverride(selectedDoorId)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer' }}>
              Reset
            </button>
          )}
          <button onClick={() => setSelectedDoor(null)}
            style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '4px 14px' }} onMouseDown={e => e.stopPropagation()}>

        {/* Wall */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', borderBottom: `1px solid ${IW.border}` }}>
          <span style={{ fontSize: 11, color: IW.muted }}>Wall</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['W1', 'W2', 'W3', 'W4'] as const).map(w => (
              <button key={w} onClick={() => patch({ wall: w })}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: wall === w ? IW.accent : IW.card,
                  color:      wall === w ? IW.bg     : IW.muted,
                  border: `1px solid ${wall === w ? IW.accent : IW.border}`,
                  cursor: 'pointer',
                }}>
                {w} <span style={{ fontSize: 9, opacity: 0.5 }}>{wallLabels[w]}</span>
              </button>
            ))}
          </div>
        </div>

        <SliderRow label="Along wall"       value={along} min={0}   max={1}  step={0.005} decimals={3} onChange={v => patch({ along: v })} />
        <SliderRow label="Thickness offset" value={dist}  min={0}   max={1}  step={0.01}  decimals={2} unit="m" onChange={v => patch({ distFromWall: v })} />
        <SliderRow label="Size (width)"     value={size}  min={0.3} max={3}  step={0.01}  decimals={2} unit="m" onChange={v => patch({ size: v })} />

        {/* Swing direction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', borderBottom: `1px solid ${IW.border}` }}>
          <span style={{ fontSize: 11, color: IW.muted }}>Swing direction</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {([{ label: '← Left', val: -1 }, { label: 'Right →', val: 1 }] as const).map(opt => (
              <button key={opt.val} onClick={() => patch({ swingDir: opt.val })}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: swingDir === opt.val ? IW.accent : IW.card,
                  color:      swingDir === opt.val ? IW.bg     : IW.muted,
                  border: `1px solid ${swingDir === opt.val ? IW.accent : IW.border}`,
                  cursor: 'pointer',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wall mask — always on door's own wall */}
        <div style={{ paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: IW.highlight, fontFamily: "'Instrument Serif', Georgia, serif" }}>
              Wall Mask
            </span>
            <span style={{ fontSize: 9, color: IW.accentDim, marginLeft: 4 }}>{wall}</span>
            <div style={{ flex: 1 }} />
            {(maskWidth > 0 || maskHeight > 0) && (
              <button
                onClick={() => patch({ maskWidth: 0, maskHeight: 0, maskAlong: undefined })}
                style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: IW.card, color: IW.muted, border: `1px solid ${IW.border}`, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          <SliderRow label="Mask along wall" value={maskAlong}  min={0} max={1} step={0.005} decimals={3} onChange={v => patch({ maskAlong: v })} />
          <SliderRow label="Mask width"      value={maskWidth}  min={0} max={5} step={0.01}  decimals={2} unit="m" onChange={v => patch({ maskWidth: v })} />
          <SliderRow label="Mask height"     value={maskHeight} min={0} max={5} step={0.01}  decimals={2} unit="m" onChange={v => patch({ maskHeight: v })} />
        </div>

      </div>

      {/* Copy JSON — sticky at bottom */}
      <div style={{ padding: '4px 14px 12px', position: 'sticky', bottom: 0, background: IW.bg }} onMouseDown={e => e.stopPropagation()}>
        <button
          onClick={() => {
            const out = {
              wall,
              along:        Number(along.toFixed(3)),
              distFromWall: Number(dist.toFixed(3)),
              swingDir,
              size:         Number(size.toFixed(2)),
              maskWidth:    Number(maskWidth.toFixed(2)),
              maskHeight:   Number(maskHeight.toFixed(2)),
              maskAlong:    Number(maskAlong.toFixed(3)),
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
