import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore, type FurnitureOverride } from '../../store/store';
import _layoutInit from '../../constants/anchorLayout.json';
import type { AnchorDef } from '../../utils/anchorResolver';

let _layout = _layoutInit;
if (import.meta.hot) {
  import.meta.hot.accept('../../constants/anchorLayout.json', (mod) => {
    _layout = (mod as unknown as { default: typeof _layoutInit }).default;
  });
}

type FurnitureDef = {
  id: string;
  model: string;
  anchor: AnchorDef;
  rot: number;
  size: number;
  distFromWall?: number;
  yOffset?: number;
};

function findPiece(id: string): { piece: FurnitureDef; roomId: string } | null {
  for (const [roomId, roomDef] of Object.entries(_layout.rooms)) {
    const found = (roomDef as { furniture: FurnitureDef[] }).furniture.find(f => f.id === id);
    if (found) return { piece: found, roomId };
  }
  return null;
}

function SliderRow({
  label, value, min, max, step, unit = '', decimals = 3, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; decimals?: number; onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value.toFixed(decimals));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-1 py-2 border-b last:border-0" style={{ borderColor: '#404040' }}>
      <div className="flex justify-between items-center">
        <span className="text-[11px]" style={{ color: '#888888' }}>{label}</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={draft}
            min={min} max={max} step={step}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
            className="text-[11px] font-mono font-semibold text-right w-20 rounded px-1"
            style={{ background: '#404040', color: '#E8E8E6', border: '1px solid #E8E8E6', outline: 'none' }}
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-[11px] font-mono font-semibold rounded px-1 hover:underline"
            style={{ color: '#E8E8E6', background: 'transparent', border: 'none', cursor: 'text' }}
            title="Click to type a value"
          >
            {value.toFixed(decimals)}{unit}
          </button>
        )}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#E8E8E6' }}
      />
    </div>
  );
}

const PANEL_W_FI = 288;
const PANEL_H_FI = 500;

function clampFI(x: number, y: number) {
  return {
    x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth  - PANEL_W_FI - 8)),
    y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - PANEL_H_FI - 8)),
  };
}

function useDraggable(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(() => clampFI(initialPos.x, initialPos.y));
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    const onResize = () => setPos(p => clampFI(p.x, p.y));
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
      setPos(clampFI(
        origin.current.px + (e.clientX - origin.current.mx),
        origin.current.py + (e.clientY - origin.current.my),
      ));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return { pos, onMouseDown };
}

export function FurnitureInspector() {
  const selectedFurnitureId = useAppStore(s => s.selectedFurnitureId);
  const furnitureOverrides = useAppStore(s => s.furnitureOverrides);
  const setSelectedFurniture = useAppStore(s => s.setSelectedFurniture);
  const updateFurnitureOverride = useAppStore(s => s.updateFurnitureOverride);
  const resetFurnitureOverride = useAppStore(s => s.resetFurnitureOverride);

  const { pos, onMouseDown } = useDraggable({ x: window.innerWidth - 312, y: window.innerHeight - 520 });

  if (!selectedFurnitureId) return null;
  const found = findPiece(selectedFurnitureId);
  if (!found) return null;

  const { piece, roomId } = found;
  const ov = furnitureOverrides[selectedFurnitureId] ?? {};

  const baseAnchor = piece.anchor as AnchorDef & { wall?: string; along?: number };
  const isWallAnchor = baseAnchor.type === 'wall';
  const isObjectAnchor = baseAnchor.type === 'object';

  const along = ov.along ?? baseAnchor.along ?? 0.5;
  const dist = ov.distFromWall ?? piece.distFromWall ?? 0.3;
  const rot = ov.rot ?? piece.rot;
  const size = ov.size ?? piece.size;
  const yOffset = ov.yOffset ?? piece.yOffset ?? 0;
  const wall = (ov.wall ?? baseAnchor.wall ?? 'W1') as 'W1' | 'W2' | 'W3' | 'W4';

  const patch = (p: Partial<FurnitureOverride>) => updateFurnitureOverride(selectedFurnitureId, p);
  const modelLabel = piece.model.replace(/^(quat:|furn:)/, '');

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 288,
        maxHeight: `calc(100vh - ${pos.y + 8}px)`,
        overflowY: 'auto',
        zIndex: 9997,
        background: '#111111',
        border: '1px solid #404040',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Drag handle header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #404040', cursor: 'grab' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0E6D0' }}>{modelLabel}</p>
          <p className="text-[10px]" style={{ color: '#6A5E4C' }}>{selectedFurnitureId} · {roomId}</p>
        </div>
        <div className="flex gap-2 items-center" onMouseDown={e => e.stopPropagation()}>
          {Object.keys(ov).length > 0 && (
            <button
              onClick={() => resetFurnitureOverride(selectedFurnitureId)}
              className="text-[10px] px-2 py-1 rounded-md"
              style={{ background: '#242424', color: '#E8E8E6', border: '1px solid #404040' }}
              title="Reset to layout defaults"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setSelectedFurniture(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: '#404040', color: '#888888' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2" style={{ userSelect: 'none' }} onMouseDown={e => e.stopPropagation()}>

        {/* Wall selector */}
        {isWallAnchor && (
          <div className="flex flex-col gap-1 py-2 border-b" style={{ borderColor: '#404040' }}>
            <span className="text-[11px]" style={{ color: '#888888' }}>Wall</span>
            <div className="flex gap-1.5">
              {(['W1', 'W2', 'W3', 'W4'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => patch({ wall: w })}
                  className="flex-1 py-1 rounded-md text-[11px] font-semibold transition-colors"
                  style={{
                    background: wall === w ? '#E8E8E6' : '#404040',
                    color: wall === w ? '#111111' : '#888888',
                    border: '1px solid #404040',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[9px] mt-0.5" style={{ color: '#4A3E2C' }}>
              <span>N</span><span>E</span><span>S</span><span>W</span>
            </div>
          </div>
        )}

        {isWallAnchor && (
          <SliderRow label="Along wall" value={along} min={0} max={1} step={0.005} decimals={3}
            onChange={v => patch({ along: v })} />
        )}

        {!isObjectAnchor && (
          <SliderRow label="Dist from wall" value={dist} min={0.05} max={20} step={0.05} unit="m" decimals={2}
            onChange={v => patch({ distFromWall: v })} />
        )}

        <SliderRow
          label="Rotation"
          value={Math.round((rot * 180) / Math.PI)}
          min={-180} max={180} step={1} unit="°" decimals={0}
          onChange={v => patch({ rot: (v * Math.PI) / 180 })}
        />

        <SliderRow label="Size" value={size} min={0.1} max={20} step={0.05} unit="m" decimals={2}
          onChange={v => patch({ size: v })} />

        {!isObjectAnchor && (
          <SliderRow label="Height offset" value={yOffset} min={0} max={20} step={0.05} unit="m" decimals={2}
            onChange={v => patch({ yOffset: v })} />
        )}

      </div>

      {/* Copy JSON */}
      <div className="px-4 pb-3" onMouseDown={e => e.stopPropagation()}>
        <button
          onClick={() => {
            const full = {
              along: Number(along.toFixed(3)),
              distFromWall: Number(dist.toFixed(3)),
              rot: Number(rot.toFixed(4)),
              size: Number(size.toFixed(3)),
              yOffset: yOffset !== 0 ? Number(yOffset.toFixed(3)) : undefined,
              wall: isWallAnchor ? wall : undefined,
            };
            const clean = Object.fromEntries(Object.entries(full).filter(([, v]) => v !== undefined));
            navigator.clipboard?.writeText(JSON.stringify(clean, null, 2));
          }}
          className="w-full py-1.5 rounded-lg text-[11px] font-semibold"
          style={{ background: '#404040', color: '#E8E8E6', border: '1px solid #404040' }}
        >
          Copy values as JSON
        </button>
      </div>
    </div>
  );
}
