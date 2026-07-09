import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useAppStore } from '../../store/store';
import { useActStore } from '../../store/actStore';
import { XRayMaterial } from './xrayMaterial';
import { colors } from '../../theme/tokens';
import type { PlacedObject, Room } from '../../types';

// Brief (~1.4s), object/room-scoped scan accent: sweep → hold → fade, then hands off
// to the lens panel via useActStore.openLens(). Mounted inside <Canvas> as a sibling
// of SmartLights/GhostPreview (wiring done elsewhere, see DigitalTwinCanvas.tsx).

interface Bounds {
  center: THREE.Vector3;
  size: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
}

// Placed devices carry no width/height/depth in the store , use a restrained
// human-device-scale default box for the scan volume.
const DEFAULT_OBJECT_SIZE = new THREE.Vector3(1.1, 1.6, 1.1);

function resolveBounds(targetId: string, rooms: Room[], placedObjects: PlacedObject[]): Bounds | null {
  if (targetId === 'house' && rooms.length > 0) {
    let minX = Infinity, maxX = -Infinity;
    let minY = 0, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    rooms.forEach((r) => {
      const w = r.width;
      const h = r.height ?? 3.2;
      const d = r.depth;
      const x = r.position.x;
      const z = r.position.z;
      const rMinX = x - w / 2;
      const rMaxX = x + w / 2;
      const rMinZ = z - d / 2;
      const rMaxZ = z + d / 2;
      if (rMinX < minX) minX = rMinX;
      if (rMaxX > maxX) maxX = rMaxX;
      if (rMinZ < minZ) minZ = rMinZ;
      if (rMaxZ > maxZ) maxZ = rMaxZ;
      if (h > maxY) maxY = h;
    });
    const size = new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ);
    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    return {
      center,
      size,
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ),
    };
  }

  const room = rooms.find((r) => r.id === targetId);
  if (room) {
    const size = new THREE.Vector3(room.width, room.height ?? 3.2, room.depth);
    const center = new THREE.Vector3(room.position.x, size.y / 2, room.position.z);
    return {
      center,
      size,
      min: new THREE.Vector3(center.x - size.x / 2, 0, center.z - size.z / 2),
      max: new THREE.Vector3(center.x + size.x / 2, size.y, center.z + size.z / 2),
    };
  }

  const obj = placedObjects.find((o) => o.id === targetId);
  if (obj) {
    const size = DEFAULT_OBJECT_SIZE.clone();
    const baseY = obj.position.y;
    const center = new THREE.Vector3(obj.position.x, baseY + size.y / 2, obj.position.z);
    return {
      center,
      size,
      min: new THREE.Vector3(center.x - size.x / 2, baseY, center.z - size.z / 2),
      max: new THREE.Vector3(center.x + size.x / 2, baseY + size.y, center.z + size.z / 2),
    };
  }

  return null;
}

function setSparklesOpacity(points: THREE.Points | null, value: number) {
  if (!points) return;
  const attr = points.geometry.attributes.opacity as THREE.BufferAttribute | undefined;
  if (!attr) return;
  const arr = attr.array as Float32Array;
  arr.fill(value);
  attr.needsUpdate = true;
}

export function XRayEffect() {
  const { camera } = useThree();
  const rooms = useAppStore((s) => s.rooms);
  const placedObjects = useAppStore((s) => s.placedObjects);
  const xray = useActStore((s) => s.xray);

  const materialRef = useRef<InstanceType<typeof XRayMaterial>>(null);
  const edgesMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const sparklesRef = useRef<THREE.Points>(null);

  const bounds = useMemo(() => {
    if (!xray.active || !xray.targetId) return null;
    return resolveBounds(xray.targetId, rooms, placedObjects);
  }, [xray.active, xray.targetId, rooms, placedObjects]);

  useEffect(() => {
    if (!xray.active || !bounds) return;
    const material = materialRef.current;
    const edgesMat = edgesMaterialRef.current;
    const sparkles = sparklesRef.current;
    if (!material) return;

    material.uScanY = bounds.min.y;
    material.uOpacity = 0;
    if (edgesMat) edgesMat.opacity = 0;
    setSparklesOpacity(sparkles, 0);

    const sparkleProxy = { opacity: 0 };
    const targetId = xray.targetId;

    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      onComplete: () => {
        const proj = bounds.center.clone().project(camera);
        const xPct = ((proj.x + 1) / 2) * 100;
        const yPct = ((1 - proj.y) / 2) * 100;
        const variant = xray.lensVariant || 'scenario';
        useActStore.getState().openLens(variant, { x: xPct, y: yPct });
        // No dedicated single-field reset action on the real store , clear just xray.
        useActStore.setState({ xray: { active: false, targetId: null, lensVariant: undefined } });
      },
    });

    // Sweep in (0 → 0.18s): rim/band fade up, band starts at the bottom of the volume.
    tl.to(material, { uOpacity: 0.85, duration: 0.18, ease: 'power1.out' }, 0);
    // Sweep the scan band from bottom to top of the target volume.
    tl.to(material, { uScanY: bounds.max.y, duration: 0.85, ease: 'power1.inOut' }, 0.1);
    tl.to(edgesMat ?? {}, { opacity: 0.8, duration: 0.2 }, 0.1);
    // Sparkle burst tracing upward alongside the sweep.
    tl.to(sparkleProxy, {
      opacity: 0.9,
      duration: 0.5,
      onUpdate: () => setSparklesOpacity(sparkles, sparkleProxy.opacity),
    }, 0.15);
    // Hold briefly, then fade everything out.
    tl.to(material, { uOpacity: 0, duration: 0.35, ease: 'power1.in' }, 1.0);
    tl.to(edgesMat ?? {}, { opacity: 0, duration: 0.35 }, 1.0);
    tl.to(sparkleProxy, {
      opacity: 0,
      duration: 0.35,
      onUpdate: () => setSparklesOpacity(sparkles, sparkleProxy.opacity),
    }, 1.0);
    // Total duration ~1.35-1.4s.

    // If the target changes/deactivates mid-flight (targetId still closed over from
    // trigger time), kill the timeline rather than let it fire a stale openLens/reset.
    return () => {
      tl.kill();
      void targetId;
    };
  }, [xray.active, xray.targetId, bounds, camera]);

  if (!bounds) return null;

  const accentHex = colors.ember[500];
  const rimHex = colors.copper[500];

  return (
    <group position={[bounds.center.x, bounds.center.y, bounds.center.z]}>
      <mesh renderOrder={10}>
        <boxGeometry args={[bounds.size.x, bounds.size.y, bounds.size.z]} />
        <xRayMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          uColor={new THREE.Vector3(
            new THREE.Color(accentHex).r,
            new THREE.Color(accentHex).g,
            new THREE.Color(accentHex).b,
          )}
        />
      </mesh>
      <lineSegments renderOrder={11}>
        <edgesGeometry args={[new THREE.BoxGeometry(bounds.size.x, bounds.size.y, bounds.size.z)]} />
        <lineBasicMaterial ref={edgesMaterialRef} color={rimHex} transparent opacity={0} />
      </lineSegments>
      <Sparkles
        ref={sparklesRef}
        count={36}
        scale={[bounds.size.x * 0.85, bounds.size.y * 0.95, bounds.size.z * 0.85]}
        size={2.2}
        speed={0.35}
        color={colors.ember[300]}
        opacity={0}
      />
    </group>
  );
}
