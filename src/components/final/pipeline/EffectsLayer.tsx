import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { ActiveEffect } from './types';
import type { Quality } from './quality';
import { pathAnchor } from './layerLayout';

interface EffectsLayerProps {
  effects: ActiveEffect[];
  /** cpuScrollProgress — anchors follow the layer layout at this progress. */
  s: number;
  quality: Quality;
}

/**
 * Memory & routines "moments": one small scene per EffectKind, ALL driven
 * purely by effect.progress (0..1) — no internal clocks, so scrubbing to a
 * point renders exactly the same picture as playing to it. Mounted inside
 * FinalArchitectureStack's group (inherits scale/rotation). Each moment is
 * <= ~6 meshes, casts no shadows. At most 2 Html labels are mounted at once
 * (the 2 most recent active effects).
 */
export function EffectsLayer({ effects, s, quality }: EffectsLayerProps) {
  const seg = quality === 'high' ? 32 : 16;

  return (
    <group>
      {effects.map((effect, i) => {
        // Label budget: only the 2 most recent active effects carry Html.
        const showLabel = i >= effects.length - 2;
        const anchor = pathAnchor(effect.anchor, s);
        const key = `${effect.kind}-${String(effect.anchor)}-${i}`;
        const common = { effect, seg, showLabel } as const;

        return (
          <group key={key} position={[anchor.x, anchor.y, anchor.z]}>
            {effect.kind === 'vault-write' && <VaultMoment {...common} />}
            {(effect.kind === 'cache-set' || effect.kind === 'cache-hit') && (
              <CacheSlotMoment {...common} hit={effect.kind === 'cache-hit'} />
            )}
            {effect.kind === 'rule-forge' && <ForgeMoment {...common} />}
            {effect.kind === 'rule-promote' && <PromoteMoment {...common} s={s} />}
            {effect.kind === 'device-actuate' && <ActuateMoment {...common} />}
            {effect.kind === 'event-log' && <EventLogMoment {...common} />}
            {effect.kind === 'session-buffer' && <SessionBufferMoment {...common} />}
            {effect.kind === 'cloud-history-write' && <CloudHistoryMoment {...common} />}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Linear ramp of progress p across the [a, b] window. */
const window01 = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

interface MomentProps {
  effect: ActiveEffect;
  seg: number;
  showLabel: boolean;
}

function EffectLabel({ text, y = 0.9, color = '#e0dbd5' }: { text: string; y?: number; color?: string }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          color,
          backgroundColor: 'rgba(15,15,17,0.85)',
          border: '1px solid rgba(74,65,55,0.4)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}
      >
        {text}
      </div>
    </Html>
  );
}

/** Copper safe rises, lid opens, glowing entry chip files in, lid shuts, safe sinks. */
function VaultMoment({ effect, showLabel }: MomentProps) {
  const p = effect.progress;
  const rise = window01(p, 0, 0.25);
  const lidOpen = window01(p, 0.25, 0.4) - window01(p, 0.7, 0.85); // opens then shuts
  const chipIn = window01(p, 0.4, 0.7);
  const sink = window01(p, 0.85, 1);

  const bodyY = THREE.MathUtils.lerp(-0.7, 0.25, rise) - sink * 0.95;
  const fade = 1 - sink;

  return (
    <group position={[0, bodyY, 0]}>
      {/* Safe body */}
      <mesh>
        <boxGeometry args={[0.9, 0.5, 0.7]} />
        <meshStandardMaterial color="#d9a98a" metalness={0.8} roughness={0.25} transparent opacity={fade} />
      </mesh>
      {/* Lid, hinged at the back edge */}
      <group position={[0, 0.26, -0.35]} rotation={[-lidOpen * 1.7, 0, 0]}>
        <mesh position={[0, 0.02, 0.35]}>
          <boxGeometry args={[0.92, 0.05, 0.72]} />
          <meshStandardMaterial color="#c08662" metalness={0.85} roughness={0.2} transparent opacity={fade} />
        </mesh>
      </group>
      {/* Glowing ledger-entry chip sliding down into the safe */}
      {chipIn > 0 && p < 0.85 && (
        <mesh position={[0, THREE.MathUtils.lerp(0.9, 0.1, chipIn), 0]}>
          <boxGeometry args={[0.4, 0.06, 0.28]} />
          <meshBasicMaterial color="#e9b44c" toneMapped={false} transparent opacity={fade} />
        </mesh>
      )}
      {showLabel && chipIn > 0.05 && p < 0.85 && (
        <EffectLabel text={effect.label} y={1.15} color="#e9b44c" />
      )}
    </group>
  );
}

/** 4x2 slot-frame grid materializes; one slot fills with an amber cube (set) or the cube double-flashes green (hit). */
function CacheSlotMoment({ effect, showLabel, hit }: MomentProps & { hit: boolean }) {
  const p = effect.progress;
  const gridIn = window01(p, 0, 0.25);
  const fill = window01(p, 0.3, 0.6);

  const SLOT = 0.42;
  const GAP = 0.1;
  const COLS = 4;
  const ROWS = 2;
  const slotX = (col: number) => (col - (COLS - 1) / 2) * (SLOT + GAP);
  const slotZ = (row: number) => (row - (ROWS - 1) / 2) * (SLOT + GAP);

  // One lineSegments holds all 8 slot outlines (single mesh, flat on the chip plane).
  const gridGeometry = useMemo(() => {
    const positions: number[] = [];
    const h = SLOT / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = slotX(col);
        const cz = slotZ(row);
        const corners = [
          [cx - h, 0, cz - h], [cx + h, 0, cz - h],
          [cx + h, 0, cz + h], [cx - h, 0, cz + h],
        ];
        for (let e = 0; e < 4; e++) {
          const a = corners[e];
          const b = corners[(e + 1) % 4];
          positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 'cache-hit': double flash green via a progress-derived step (two on-windows).
  const flashOn = hit && ((p >= 0.35 && p < 0.5) || (p >= 0.6 && p < 0.75));
  const cubeColor = flashOn ? '#3bf574' : '#e9b44c';
  const cubeScale = hit ? 1 : Math.max(fill, 0.0001);

  return (
    <group position={[0, 0.35, 0]}>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#e9b44c" transparent opacity={gridIn * 0.85} toneMapped={false} />
      </lineSegments>
      {(hit || fill > 0) && (
        <mesh position={[slotX(1), 0.09, slotZ(0)]} scale={[cubeScale, cubeScale, cubeScale]}>
          <boxGeometry args={[0.3, 0.18, 0.3]} />
          <meshBasicMaterial color={cubeColor} toneMapped={false} transparent opacity={0.95} />
        </mesh>
      )}
      {showLabel && p > 0.25 && <EffectLabel text={effect.label} y={0.8} color="#e9b44c" />}
    </group>
  );
}

/** Disc fades in, stamps (scaleY squash around progress 0.5), hovers with the rule-name label — mirrors Layer 5's Rule Forge. */
function ForgeMoment({ effect, seg, showLabel }: MomentProps) {
  const p = effect.progress;
  const fadeIn = window01(p, 0, 0.3);
  const stamp = Math.sin(window01(p, 0.4, 0.6) * Math.PI); // squash dip around p=0.5
  const discScaleY = 1 - 0.6 * stamp;
  const discScaleXZ = 1 + 0.15 * stamp;
  const fadeOut = 1 - window01(p, 0.9, 1);

  return (
    <group position={[0, 0.3, 0]}>
      <mesh scale={[discScaleXZ, discScaleY, discScaleXZ]}>
        <cylinderGeometry args={[0.14, 0.14, 0.03, Math.min(seg, 20)]} />
        <meshStandardMaterial
          color="#ff3333"
          emissive="#ff3333"
          emissiveIntensity={1.6}
          roughness={0.15}
          transparent
          opacity={fadeIn * fadeOut}
        />
      </mesh>
      {showLabel && fadeIn > 0.5 && <EffectLabel text={effect.label} y={0.6} color="#ff8a8a" />}
    </group>
  );
}

/** Stamped rule disc arcs from Layer 5 down to Layer 0; green pulse ring on landing. */
function PromoteMoment({ effect, seg, showLabel, s }: MomentProps & { s: number }) {
  const p = effect.progress;
  const from = pathAnchor(5, s);
  const to = pathAnchor(0, s);
  // Quadratic bezier: control point above the midpoint for a rising arc.
  const cx = (from.x + to.x) / 2;
  const cy = Math.max(from.y, to.y) + 3.0;
  const cz = (from.z + to.z) / 2;
  const t = clamp01(p / 0.85); // lands at p=0.85, pulse after
  const inv = 1 - t;
  const px = inv * inv * from.x + 2 * inv * t * cx + t * t * to.x;
  const py = inv * inv * from.y + 2 * inv * t * cy + t * t * to.y;
  const pz = inv * inv * from.z + 2 * inv * t * cz + t * t * to.z;

  const pulseT = window01(p, 0.85, 1);
  const pulseScale = 0.3 + pulseT * 2.2;

  // Rendered in the anchor group's local space, so subtract the anchor origin.
  const origin = pathAnchor(effect.anchor, s);

  return (
    <group position={[-origin.x, -origin.y, -origin.z]}>
      <mesh position={[px, py + 0.3, pz]}>
        <cylinderGeometry args={[0.14, 0.14, 0.03, Math.min(seg, 20)]} />
        <meshStandardMaterial color="#3bf574" emissive="#3bf574" emissiveIntensity={1.4} roughness={0.2} transparent opacity={1 - pulseT} />
      </mesh>
      {pulseT > 0 && (
        <mesh position={[to.x, to.y + 0.15, to.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[pulseScale, pulseScale, 1]}>
          <ringGeometry args={[0.35, 0.45, seg]} />
          <meshBasicMaterial color="#3bf574" toneMapped={false} transparent opacity={(1 - pulseT) * 0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showLabel && p > 0.1 && (
        <group position={[px, py, pz]}>
          <EffectLabel text={effect.label} y={0.85} color="#3bf574" />
        </group>
      )}
    </group>
  );
}

/** Two expanding, fading rings + a small glyph chip at the actuated device. */
function ActuateMoment({ effect, seg, showLabel }: MomentProps) {
  const p = effect.progress;
  const r1 = clamp01(p / 0.7);
  const r2 = window01(p, 0.25, 0.95);
  const ring = (t: number, key: string) =>
    t > 0 && t < 1 ? (
      <mesh key={key} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.3 + t * 1.8, 0.3 + t * 1.8, 1]}>
        <ringGeometry args={[0.4, 0.48, seg]} />
        <meshBasicMaterial color="#3da5e0" toneMapped={false} transparent opacity={(1 - t) * 0.85} side={THREE.DoubleSide} />
      </mesh>
    ) : null;

  return (
    <group>
      {ring(r1, 'ring-1')}
      {ring(r2, 'ring-2')}
      {showLabel && p > 0.05 && p < 0.95 && <EffectLabel text={`⚡ ${effect.label}`} y={0.7} color="#3da5e0" />}
    </group>
  );
}

/** Thin ledger strip; one glowing row grows in with progress. */
function EventLogMoment({ effect, showLabel }: MomentProps) {
  const p = effect.progress;
  const stripIn = window01(p, 0, 0.2);
  const rowGrow = window01(p, 0.2, 0.8);
  const fadeOut = 1 - window01(p, 0.9, 1);

  return (
    <group position={[0, 0.3, 0]}>
      {/* Ledger strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 0.55]} />
        <meshBasicMaterial color="#141312" transparent opacity={stripIn * 0.85 * fadeOut} side={THREE.DoubleSide} />
      </mesh>
      {/* Appending row */}
      {rowGrow > 0 && (
        <mesh position={[(-1.7 / 2) * (1 - rowGrow), 0.02, 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[rowGrow, 1, 1]}>
          <planeGeometry args={[1.5, 0.1]} />
          <meshBasicMaterial color="#3bf574" toneMapped={false} transparent opacity={0.9 * fadeOut} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showLabel && rowGrow > 0.2 && p < 0.9 && <EffectLabel text={effect.label} y={0.55} color="#3bf574" />}
    </group>
  );
}

/** Volatile local RAM: packets fill a small buffer, then deliberately fade. */
function SessionBufferMoment({ effect, showLabel }: MomentProps) {
  const p = effect.progress;
  const fill = window01(p, 0.08, 0.58);
  const fade = 1 - window01(p, 0.78, 1);
  return (
    <group position={[0, 0.42, 0]}>
      <mesh>
        <boxGeometry args={[1.45, 0.52, 0.72]} />
        <meshStandardMaterial color="#183142" emissive="#00c8ff" emissiveIntensity={0.35} transparent opacity={0.72 * fade} />
      </mesh>
      {[0, 1, 2, 3].map((slot) => (
        <mesh key={slot} position={[-0.48 + slot * 0.32, 0, 0.38]} scale={[fill > slot / 4 ? 1 : 0.001, 1, 1]}>
          <boxGeometry args={[0.22, 0.22, 0.04]} />
          <meshBasicMaterial color="#62dcff" toneMapped={false} transparent opacity={fade} />
        </mesh>
      ))}
      {showLabel && fill > 0.2 && <EffectLabel text={effect.label} y={0.78} color="#62dcff" />}
    </group>
  );
}

/** Durable cloud history: encrypted event packet rises into a cloud archive. */
function CloudHistoryMoment({ effect, seg, showLabel }: MomentProps) {
  const p = effect.progress;
  const rise = window01(p, 0.12, 0.68);
  const fade = 1 - window01(p, 0.85, 1);
  return (
    <group>
      <mesh position={[0, 0.64, 0]}>
        <sphereGeometry args={[0.52, Math.min(seg, 20), Math.min(seg, 20)]} />
        <meshBasicMaterial color="#6479ff" toneMapped={false} transparent opacity={0.22 * fade} />
      </mesh>
      <mesh position={[0, THREE.MathUtils.lerp(-0.42, 0.64, rise), 0]} rotation={[0.25, p * 5, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.28]} />
        <meshBasicMaterial color="#b9c5ff" toneMapped={false} transparent opacity={fade} />
      </mesh>
      {showLabel && rise > 0.15 && <EffectLabel text={effect.label} y={1.28} color="#b9c5ff" />}
    </group>
  );
}

export default EffectsLayer;
