import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ── Bounding-box grounding helper ────────────────────────────────────────────
// After a GLB loads, compute its exact bottom edge and shift the group so
// bbox.min.y === 0. This guarantees ZERO floating geometry.
function groundToFloor(group: THREE.Group) {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return;
  group.position.y -= box.min.y;
}

// ── Scale helper , normalises a loaded GLB so its longest XZ dimension
// matches targetSize world units. Applies BEFORE grounding.
function normaliseScale(group: THREE.Group, targetSize: number) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maxXZ = Math.max(size.x, size.z);
  if (maxXZ === 0) return;
  const s = targetSize / maxXZ;
  group.scale.multiplyScalar(s);
}

// ── Enable shadows on every mesh inside the loaded GLB ───────────────────────
function applyShadows(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

interface GLBProps {
  targetSize?: number; // longest XZ dimension in world units
  emissiveColor?: string;
  emissiveIntensity?: number;
}

// ── Generic GLB loader ───────────────────────────────────────────────────────
function GLBModel({
  url,
  targetSize = 1.0,
  emissiveColor,
  emissiveIntensity = 0,
}: GLBProps & { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Clone so multiple instances don't share the same object
  const cloned = useRef<THREE.Group | null>(null);
  if (!cloned.current) {
    cloned.current = scene.clone(true);
  }

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;

    normaliseScale(g, targetSize);
    groundToFloor(g);
    applyShadows(g);

    // Optionally tint emissive for device-state glow
    if (emissiveColor) {
      g.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
              m.emissive = new THREE.Color(emissiveColor);
              m.emissiveIntensity = emissiveIntensity;
            }
          });
        }
      });
    }
  }, [targetSize, emissiveColor, emissiveIntensity]);

  return <primitive ref={groupRef} object={cloned.current} />;
}

// ── Exported furniture components ────────────────────────────────────────────

export function GLBSofa() {
  return <GLBModel url="/models/furniture/premium_sofa.glb" targetSize={2.2} />;
}

export function GLBLoungeSofa() {
  return <GLBModel url="/models/furniture/loungeSofa.glb" targetSize={1.8} />;
}

export function GLBChair() {
  return <GLBModel url="/models/furniture/chairCushion.glb" targetSize={0.55} />;
}

export function GLBModernChair() {
  return <GLBModel url="/models/furniture/chairModernCushion.glb" targetSize={0.55} />;
}

export function GLBBed() {
  return <GLBModel url="/models/furniture/premium_bed.glb" targetSize={2.1} />;
}

// `dining` → the dressed premium dining table (kitchen). Otherwise a plain coffee table
// for the living room, so the candle/plate-dressed hero piece only shows where it belongs.
export function GLBTable({ dining = false }: { dining?: boolean; round?: boolean }) {
  return dining
    ? <GLBModel url="/models/furniture/premium_dining.glb" targetSize={1.9} />
    : <GLBModel url="/models/furniture/tableCoffee.glb" targetSize={1.0} />;
}

export function GLBCoffeeTable() {
  return <GLBModel url="/models/furniture/tableCoffee.glb" targetSize={0.9} />;
}

export function GLBBookshelf() {
  return <GLBModel url="/models/furniture/bookcaseOpen.glb" targetSize={0.9} />;
}

export function GLBWardrobe() {
  return <GLBModel url="/models/furniture/cabinetBedDrawer.glb" targetSize={0.85} />;
}

export function GLBTVStand() {
  return <GLBModel url="/models/furniture/premium_tvconsole.glb" targetSize={1.9} />;
}

export function GLBDesk() {
  return <GLBModel url="/models/furniture/desk.glb" targetSize={1.1} />;
}

export function GLBBathtub() {
  return <GLBModel url="/models/furniture/bathtub.glb" targetSize={1.4} />;
}

export function GLBPlant() {
  return <GLBModel url="/models/furniture/premium_plant.glb" targetSize={0.9} />;
}

export function GLBSpeaker({ isOn }: { isOn: boolean }) {
  return (
    <GLBModel
      url="/models/furniture/speakerSmall.glb"
      targetSize={0.22}
      emissiveColor={isOn ? '#E8E8E6' : undefined}
      emissiveIntensity={isOn ? 0.6 : 0}
    />
  );
}

export function GLBEchoShow({ isOn }: { isOn: boolean }) {
  return (
    <GLBModel
      url="/models/furniture/computerScreen.glb"
      targetSize={0.28}
      emissiveColor={isOn ? '#F0F0EE' : '#111'}
      emissiveIntensity={isOn ? 1.2 : 0.05}
    />
  );
}

export function GLBSmartTV({ isOn }: { isOn: boolean }) {
  return (
    <GLBModel
      url="/models/furniture/televisionModern.glb"
      targetSize={1.0}
      emissiveColor={isOn ? '#001020' : '#050505'}
      emissiveIntensity={isOn ? 0.4 : 0}
    />
  );
}

// Kitchen appliance set , rendered as a group at a fixed local offset
export function GLBKitchenFridge() {
  return <GLBModel url="/models/furniture/kitchenFridge.glb" targetSize={0.68} />;
}

export function GLBKitchenStove() {
  return <GLBModel url="/models/furniture/kitchenStove.glb" targetSize={0.65} />;
}

export function GLBKitchenSink() {
  return <GLBModel url="/models/furniture/kitchenSink.glb" targetSize={0.65} />;
}

export function GLBKitchenCabinet() {
  return <GLBModel url="/models/furniture/kitchenCabinet.glb" targetSize={0.65} />;
}

// Preload all models so they're ready when the canvas renders
useGLTF.preload('/models/furniture/premium_sofa.glb');
useGLTF.preload('/models/furniture/loungeSofa.glb');
useGLTF.preload('/models/furniture/chairCushion.glb');
useGLTF.preload('/models/furniture/chairModernCushion.glb');
useGLTF.preload('/models/furniture/premium_bed.glb');
useGLTF.preload('/models/furniture/premium_dining.glb');
useGLTF.preload('/models/furniture/tableCoffee.glb');
useGLTF.preload('/models/furniture/bookcaseOpen.glb');
useGLTF.preload('/models/furniture/cabinetBedDrawer.glb');
useGLTF.preload('/models/furniture/premium_tvconsole.glb');
useGLTF.preload('/models/furniture/desk.glb');
useGLTF.preload('/models/furniture/bathtub.glb');
useGLTF.preload('/models/furniture/premium_plant.glb');
useGLTF.preload('/models/furniture/speakerSmall.glb');
useGLTF.preload('/models/furniture/computerScreen.glb');
useGLTF.preload('/models/furniture/televisionModern.glb');
useGLTF.preload('/models/furniture/kitchenFridge.glb');
useGLTF.preload('/models/furniture/kitchenStove.glb');
useGLTF.preload('/models/furniture/kitchenSink.glb');
useGLTF.preload('/models/furniture/kitchenCabinet.glb');
