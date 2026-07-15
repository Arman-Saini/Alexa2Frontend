import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PathNodeId } from './types';
import { QUALITY_PRESETS, type Quality } from './quality';
import { heartWave } from './heartWave';
import { pathAnchor } from './layerLayout';

interface HeartFlowProps {
  heart: { bpm: number; strength: number; flowPath: PathNodeId[] };
  /** cpuScrollProgress — anchors follow the layer layout at this progress. */
  s: number;
  /** Tier accent hex — tints the blood cells and blends into the core's copper emissive. */
  accent: string;
  quality: Quality;
}

const CORE_COPPER = '#C08662';
const ORBIT_RADIUS = 0.6;

/**
 * The "HEARTH" pump: an emissive icosahedron core pulsing at the centroid of
 * the active flow path, plus one InstancedMesh of blood cells surging along a
 * CatmullRom spline through the pathAnchor() positions — pumped in spurts per
 * heartbeat, not poured. Mounted inside FinalArchitectureStack's group so it
 * inherits the stack's scale/rotation.
 */
export function HeartFlow({ heart, s, accent, quality }: HeartFlowProps) {
  const preset = QUALITY_PRESETS[quality];
  const cellCount = preset.bloodCells;

  const coreRef = useRef<THREE.Mesh>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const cellsRef = useRef<THREE.InstancedMesh>(null);

  // Preallocated scratch objects — nothing is allocated inside useFrame.
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const identityQuat = useMemo(() => new THREE.Quaternion(), []);

  // Core emissive: copper blended toward the tier accent (recomputed only
  // when the accent changes, never per frame).
  const emissiveColor = useMemo(
    () => new THREE.Color(CORE_COPPER).lerp(new THREE.Color(accent), 0.45),
    [accent],
  );

  // Per-cell curve params + fixed phase offsets (mutable, advanced per frame).
  const cellParams = useMemo(() => {
    const params = new Float32Array(cellCount);
    const phases = new Float32Array(cellCount);
    for (let i = 0; i < cellCount; i++) {
      params[i] = i / cellCount;
      phases[i] = (i / cellCount) * (60 / Math.max(heart.bpm, 1)) * 0.9;
    }
    return { params, phases };
    // Phases only need re-spreading when the cell count changes; bpm drift
    // mid-scenario intentionally does not reshuffle the cells.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellCount]);

  // Rebuild the spline + centroid ONLY when the flowPath identity or the
  // coarse pose bucket (Math.round(s*20)) changes — never per frame.
  const sBucket = Math.round(s * 20);
  const { curve, centroid, closed } = useMemo(() => {
    const path = heart.flowPath;
    const centroidV = new THREE.Vector3(0, 0, 0);

    if (path.length === 0) {
      // Stack center; no curve to ride.
      return { curve: null as THREE.CatmullRomCurve3 | null, centroid: centroidV, closed: false };
    }

    const bucketS = sBucket / 20;
    const anchors = path.map((node) => {
      const a = pathAnchor(node, bucketS);
      return new THREE.Vector3(a.x, a.y, a.z);
    });
    for (const a of anchors) centroidV.add(a);
    centroidV.divideScalar(anchors.length);

    let curveObj: THREE.CatmullRomCurve3;
    let isClosed = false;
    if (anchors.length === 1) {
      // Single-node paths: small circular orbit around the anchor.
      const c = anchors[0];
      const orbitPoints: THREE.Vector3[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(
          c.x + Math.cos(a) * ORBIT_RADIUS,
          c.y,
          c.z + Math.sin(a) * ORBIT_RADIUS,
        ));
      }
      curveObj = new THREE.CatmullRomCurve3(orbitPoints, true);
      isClosed = true;
    } else {
      curveObj = new THREE.CatmullRomCurve3(anchors);
    }
    // Precompute arc lengths now so the first getPointAt call inside
    // useFrame doesn't allocate the length cache mid-frame.
    curveObj.getLength();
    return { curve: curveObj, centroid: centroidV, closed: isClosed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heart.flowPath, sBucket]);

  // Radial-gradient back-glow texture (high quality tier only).
  const glowTexture = useMemo(() => {
    if (!preset.coreGlowSprite || typeof document === 'undefined') return null;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [preset.coreGlowSprite]);

  const inactive = heart.strength === 0 && heart.flowPath.length === 0;

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    const { bpm, strength } = heart;
    const wave = heartWave(elapsed, bpm);

    // Core: lub-dub scale + emissive pulse at the flow centroid.
    if (coreRef.current) {
      const coreScale = 1 + 0.18 * strength * wave;
      coreRef.current.scale.setScalar(coreScale);
      coreRef.current.position.copy(centroid);
    }
    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity = 0.9 + 1.5 * strength * wave;
    }
    if (glowRef.current) {
      glowRef.current.position.copy(centroid);
      const glowScale = 2.2 + 0.6 * strength * wave;
      glowRef.current.scale.set(glowScale, glowScale, 1);
      (glowRef.current.material as THREE.SpriteMaterial).opacity = 0.18 + 0.22 * strength * wave;
    }

    // Blood cells: advance each instance's curve param in beat-synced spurts.
    const mesh = cellsRef.current;
    if (mesh && curve) {
      const { params, phases } = cellParams;
      for (let i = 0; i < cellCount; i++) {
        const speed = 0.05 + 0.45 * strength * heartWave(elapsed + phases[i], bpm);
        let t = params[i] + delta * speed;
        t = t - Math.floor(t); // mod 1
        params[i] = t;

        curve.getPointAt(t, tempVec);
        // Scale taper near the curve ends (open paths only).
        const taper = closed ? 1 : Math.min(1, Math.max(0.25, Math.min(t, 1 - t) / 0.12));
        tempScale.set(taper, taper, taper);
        tempMatrix.compose(tempVec, identityQuat, tempScale);
        mesh.setMatrixAt(i, tempMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (mesh) mesh.visible = curve !== null;
  });

  return (
    <group visible={!inactive}>
      {/* Emissive heart core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, preset.coreDetail]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color={CORE_COPPER}
          emissive={emissiveColor}
          emissiveIntensity={1.2}
          roughness={0.25}
          metalness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Back-glow sprite (quality high only) */}
      {glowTexture && (
        <sprite ref={glowRef} scale={[2.2, 2.2, 1]}>
          <spriteMaterial
            map={glowTexture}
            color={accent}
            transparent
            depthWrite={false}
            opacity={0.25}
          />
        </sprite>
      )}

      {/* Blood cells — one InstancedMesh riding the flow spline */}
      <instancedMesh
        ref={cellsRef}
        args={[undefined, undefined, cellCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.07, preset.cellSegments, preset.cellSegments]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default HeartFlow;
