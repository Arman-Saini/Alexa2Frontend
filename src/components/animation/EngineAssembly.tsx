// frontend/src/components/animation/EngineAssembly.tsx
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { easedExplodeProgress, layerTargetY } from '../../utils/explodeMath';
import {
  CartoonAlexaHead,
  CartoonAlexaLens,
  GearLarge,
  GearSmall,
  CartoonAlexaBase,
  Pedestal,
  CoreShaft,
  SpinningWashers,
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
  closedY: number;
  expandedY: number;
  Component: React.ComponentType<LayerProps>;
}

// Vertical exploded layers stacking: head is top dome, base is bottom console.
// Spaced out symmetrically along Y axis.
const LAYERS: LayerDef[] = [
  { id: 'head', label: 'Top Dome', closedY: 0.0, expandedY: 2.4, Component: CartoonAlexaHead },
  { id: 'lens', label: 'Acoustic Lens', closedY: 0.0, expandedY: 1.2, Component: CartoonAlexaLens },
  { id: 'gearLarge', label: 'NLP Matrix', closedY: 0.0, expandedY: 0.0, Component: GearLarge },
  { id: 'gearSmall', label: 'Wake-Word Engine', closedY: 0.0, expandedY: -1.2, Component: GearSmall },
  { id: 'base', label: 'Base Console', closedY: 0.0, expandedY: -2.4, Component: CartoonAlexaBase },
];

// Vertical camera blending: front face (0) to elevated top-down (1) view
const LENS_DIR = new THREE.Vector3(0, 0.15, 1.0).normalize();
const TOP_DIR = new THREE.Vector3(0.5, 0.8, 0.7).normalize();
const CAM_DISTANCE = 7.2;
const LENS_LOOK_Y = 0.3;
const TOP_LOOK_Y = -0.2;

export function EngineAssembly({ onScrollChange, onHoverChange, isWhiteTheme }: EngineAssemblyProps) {
  const scroll = useScroll();
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const layerRefs = useRef<(THREE.Group | null)[]>([]);
  const lastProgressRef = useRef<number>(-1);
  const lookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, LENS_LOOK_Y, 0));
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
      const targetY = layerTargetY(layer.closedY, layer.expandedY, eased);
      ref.position.y = THREE.MathUtils.damp(ref.position.y, targetY, 8, delta);

      const targetScale = hoveredId === layer.id ? 1.08 : 1.0;
      const currentScale = THREE.MathUtils.damp(ref.scale.x, targetScale, 8, delta);
      ref.scale.setScalar(currentScale);
    });

    // Idle sway
    if (groupRef.current) {
      const idleSway = Math.sin(t * 0.4) * 0.02;
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, idleSway, 6, delta);
    }

    // Camera shot blend
    const shotT = THREE.MathUtils.clamp(progress, 0, 1);
    const easedT = shotT * shotT * (3 - 2 * shotT);

    const camDir = new THREE.Vector3().lerpVectors(LENS_DIR, TOP_DIR, easedT).normalize();
    const lookY = THREE.MathUtils.lerp(LENS_LOOK_Y, TOP_LOOK_Y, easedT);
    const desiredTarget = new THREE.Vector3(0, lookY, 0);
    const desiredPos = desiredTarget.clone().addScaledVector(camDir, CAM_DISTANCE);

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, desiredPos.x, 6, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, desiredPos.y, 6, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, desiredPos.z, 6, delta);

    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, desiredTarget.x, 6, delta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, desiredTarget.y, 6, delta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, desiredTarget.z, 6, delta);
    state.camera.lookAt(lookTargetRef.current);

    // Zoom calculation
    const shortSide = Math.min(state.size.width, state.size.height);
    const zoomForHalfExtent = (halfExtent: number) => shortSide / 2 / halfExtent;
    const baseHalfExtent = THREE.MathUtils.lerp(1.6, 2.8, easedT);
    const targetHalfExtent = isMobile ? baseHalfExtent * 1.35 : baseHalfExtent;
    state.camera.zoom = THREE.MathUtils.damp(state.camera.zoom, zoomForHalfExtent(targetHalfExtent), 7, delta);
    state.camera.updateProjectionMatrix();

    // Projected leader lines hookups
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
      {scroll.offset > 0.05 && (
        <>
          <CoreShaft isWhiteTheme={isWhiteTheme} explodedProgress={scroll.offset} />
          <SpinningWashers isWhiteTheme={isWhiteTheme} />
        </>
      )}
      <Pedestal />
      {LAYERS.map((layer, idx) => {
        const Layer = layer.Component;
        return (
          <group
            key={layer.id}
            ref={setLayerRef(idx)}
            position={[0, layer.closedY, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(layer.id);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHover(null);
            }}
          >
            <Layer
              isWhiteTheme={isWhiteTheme}
              isHovered={hoveredId === layer.id}
              explodedProgress={scroll.offset}
            />
          </group>
        );
      })}
    </group>
  );
}
