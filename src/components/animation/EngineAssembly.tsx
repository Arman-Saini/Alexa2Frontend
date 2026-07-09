// frontend/src/components/animation/EngineAssembly.tsx
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { easedExplodeProgress, layerTargetY } from '../../utils/explodeMath';
import {
  CoreShaft,
  BarrelBase,
  GearSmall,
  GearMedium,
  GearLarge,
  SpinningWashers,
  LensElement,
  type LayerProps,
} from './ProceduralParts';

export interface EngineAssemblyProps {
  onScrollChange?: (progress: number) => void;
  onHoverChange?: (layerId: string | null) => void;
  isWhiteTheme: boolean;
}

interface LayerDef {
  id: string;
  label: string;
  closedX: number;
  expandedX: number;
  Component: React.ComponentType<LayerProps>;
}

// Base (tail) → lens (mouth), along the world X axis — the barrel
// lies on its side. Adding a layer later: one array entry + one
// component in ProceduralParts.tsx, no change to the math or camera
// staging below.
const LAYERS: LayerDef[] = [
  { id: 'base', label: 'Barrel Base', closedX: 0.0, expandedX: 0.0, Component: BarrelBase },
  { id: 'gearSmall', label: 'Gear — Small', closedX: 2.55, expandedX: 3.2, Component: GearSmall },
  { id: 'gearMedium', label: 'Gear — Medium', closedX: 2.85, expandedX: 4.1, Component: GearMedium },
  { id: 'gearLarge', label: 'Gear — Large', closedX: 3.15, expandedX: 5.0, Component: GearLarge },
  { id: 'lens', label: 'Lens Element', closedX: 3.45, expandedX: 6.2, Component: LensElement },
];

// Two camera "shots" blended by scroll progress: a near-frontal close
// look at the lens at scroll 0, arcing to an elevated top-down view
// of the fully opened barrel at scroll 1.
const LENS_DIR = new THREE.Vector3(1, 0.3, 0.5).normalize();
const TOP_DIR = new THREE.Vector3(0.35, 1.3, 0.55).normalize();
const CAM_DISTANCE = 9;
const LENS_LOOK_X = 3.45;
const TOP_LOOK_X = 3.1;

export function EngineAssembly({ onScrollChange, onHoverChange, isWhiteTheme }: EngineAssemblyProps) {
  const scroll = useScroll();
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const layerRefs = useRef<(THREE.Group | null)[]>([]);
  const lastProgressRef = useRef<number>(-1);
  const lookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(LENS_LOOK_X, 0, 0));
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const setLayerRef = (index: number) => (el: THREE.Group | null) => {
    layerRefs.current[index] = el;
  };

  const setHover = (id: string | null) => {
    setHoveredId(id);
    onHoverChange?.(id);
  };

  const isMobile = viewport.width < 7;

  useFrame((state, delta) => {
    const progress = scroll.offset;
    const t = state.clock.getElapsedTime();

    if (onScrollChange && Math.abs(progress - lastProgressRef.current) > 0.001) {
      onScrollChange(progress);
      lastProgressRef.current = progress;
    }

    const eased = easedExplodeProgress(progress);

    LAYERS.forEach((layer, idx) => {
      const ref = layerRefs.current[idx];
      if (!ref) return;
      const targetX = layerTargetY(layer.closedX, layer.expandedX, eased);
      ref.position.x = THREE.MathUtils.damp(ref.position.x, targetX, 8, delta);

      const targetScale = hoveredId === layer.id ? 1.08 : 1.0;
      const currentScale = THREE.MathUtils.damp(ref.scale.x, targetScale, 8, delta);
      ref.scale.setScalar(currentScale);
    });

    // Small idle sway only — the "moving to top view" reveal is the
    // camera's job (below), not the object spinning under a fixed camera.
    if (groupRef.current) {
      const idleSway = Math.sin(t * 0.4) * 0.02;
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, idleSway, 6, delta);
    }

    // Two-shot camera blend: lens close-up (progress 0) → top-down
    // opened-barrel view (progress 1), smoothstep-eased.
    const shotT = THREE.MathUtils.clamp(progress, 0, 1);
    const easedT = shotT * shotT * (3 - 2 * shotT);

    const camDir = new THREE.Vector3().lerpVectors(LENS_DIR, TOP_DIR, easedT).normalize();
    const lookX = THREE.MathUtils.lerp(LENS_LOOK_X, TOP_LOOK_X, easedT);
    const desiredTarget = new THREE.Vector3(lookX, 0, 0);
    const desiredPos = desiredTarget.clone().addScaledVector(camDir, CAM_DISTANCE);

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, desiredPos.x, 6, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, desiredPos.y, 6, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, desiredPos.z, 6, delta);

    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, desiredTarget.x, 6, delta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, desiredTarget.y, 6, delta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, desiredTarget.z, 6, delta);
    state.camera.lookAt(lookTargetRef.current);

    // Orthographic zoom is pixel-relative (drei's default frustum is
    // ±size.width/2, ±size.height/2), so derive it from actual canvas
    // size against a target world-space half-extent per stage, rather
    // than a fixed zoom constant.
    const shortSide = Math.min(state.size.width, state.size.height);
    const zoomForHalfExtent = (halfExtent: number) => shortSide / 2 / halfExtent;
    const baseHalfExtent = THREE.MathUtils.lerp(1.6, 2.8, easedT);
    const targetHalfExtent = isMobile ? baseHalfExtent * 1.35 : baseHalfExtent;
    state.camera.zoom = THREE.MathUtils.damp(state.camera.zoom, zoomForHalfExtent(targetHalfExtent), 7, delta);
    state.camera.updateProjectionMatrix();

    // Write screen-space coordinates for the diagonal leader lines drawn
    // in AnimationPage.tsx — same imperative-DOM-write pattern the old
    // ArchitectureStack.tsx used for its connector lines.
    LAYERS.forEach((layer, idx) => {
      const ref = layerRefs.current[idx];
      if (!ref) return;

      const vec = new THREE.Vector3();
      ref.getWorldPosition(vec);
      vec.project(state.camera);

      const screenX = (vec.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-vec.y * 0.5 + 0.5) * window.innerHeight;

      const line = document.getElementById(`leader-line-${layer.id}`);
      const anchor = document.getElementById(`leader-anchor-${layer.id}`);
      if (!line || !anchor) return;

      const rect = anchor.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      const fadeIn = THREE.MathUtils.clamp((progress - 0.15) / 0.2, 0, 1);
      const fadeOut = 1.0 - THREE.MathUtils.clamp((progress - 0.85) / 0.15, 0, 1);
      const drawProgress = fadeIn * fadeOut;

      line.setAttribute('x1', `${screenX}`);
      line.setAttribute('y1', `${screenY}`);
      line.setAttribute('x2', `${THREE.MathUtils.lerp(screenX, targetX, drawProgress)}`);
      line.setAttribute('y2', `${THREE.MathUtils.lerp(screenY, targetY, drawProgress)}`);
      line.setAttribute('opacity', `${drawProgress * 0.6}`);
    });
  });

  return (
    <group ref={groupRef}>
      <CoreShaft isWhiteTheme={isWhiteTheme} />
      <SpinningWashers isWhiteTheme={isWhiteTheme} />
      {LAYERS.map((layer, idx) => {
        const Layer = layer.Component;
        return (
          <group
            key={layer.id}
            ref={setLayerRef(idx)}
            position={[layer.closedX, 0, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(layer.id);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHover(null);
            }}
          >
            <Layer isWhiteTheme={isWhiteTheme} isHovered={hoveredId === layer.id} />
          </group>
        );
      })}
    </group>
  );
}
