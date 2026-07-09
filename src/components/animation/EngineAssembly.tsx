// frontend/src/components/animation/EngineAssembly.tsx
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { easedExplodeProgress, layerTargetY } from '../../utils/explodeMath';
import {
  CoreShaft,
  LensElement,
  GearUpper,
  GearLower,
  BarrelBase,
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

// Bottom-to-top spatial order. Barrel Base is the fixed anchor (offsets 0/0).
const LAYERS: LayerDef[] = [
  { id: 'base', label: 'Barrel Base', closedY: 0.0, expandedY: 0.0, Component: BarrelBase },
  { id: 'gearLower', label: 'Lower Gear', closedY: 0.42, expandedY: 1.6, Component: GearLower },
  { id: 'gearUpper', label: 'Upper Gear', closedY: 0.84, expandedY: 3.2, Component: GearUpper },
  { id: 'lens', label: 'Lens Element', closedY: 1.26, expandedY: 4.8, Component: LensElement },
];

export function EngineAssembly({ onScrollChange, onHoverChange, isWhiteTheme }: EngineAssemblyProps) {
  const scroll = useScroll();
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const layerRefs = useRef<(THREE.Group | null)[]>([]);
  const lastProgressRef = useRef<number>(-1);
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

    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, 0, 6, delta);

      // Wide reorientation sweep (vertical → diagonal isometric) as the
      // object explodes, matching the animejs.com reference's rotation.
      const baseRotY = Math.PI / 5;
      const targetRotY = baseRotY + progress * (Math.PI * 0.55);
      const idleSway = Math.sin(t * 0.4) * 0.03;
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY + idleSway, 6, delta);

      const baseRotX = 0.45;
      const targetRotX = baseRotX + progress * 0.22;
      const idlePitch = Math.cos(t * 0.5) * 0.015;
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX + idlePitch, 6, delta);
    }

    // Orthographic zoom is pixel-relative (drei's default frustum is
    // ±size.width/2, ±size.height/2), so a fixed zoom constant renders
    // at wildly different scales across viewports. Instead pick a target
    // *world-space half-extent* the object should fill per stage, and
    // derive zoom from the actual canvas size so the object always
    // dominates the frame the same way regardless of screen size.
    const shortSide = Math.min(state.size.width, state.size.height);
    const zoomForHalfExtent = (halfExtent: number) => shortSide / 2 / halfExtent;

    let targetHalfExtent: number;
    let lookAtY: number;

    if (progress < 0.2) {
      // Overview: whole closed assembly (~4 units across) fills most of frame.
      targetHalfExtent = isMobile ? 3.0 : 2.3;
      lookAtY = 0.6;
    } else if (progress < 0.8) {
      const u = (progress - 0.2) / 0.6;
      targetHalfExtent = THREE.MathUtils.lerp(isMobile ? 3.0 : 2.3, isMobile ? 2.2 : 1.7, u);
      lookAtY = THREE.MathUtils.lerp(0.6, 2.0, u);
    } else {
      const u = (progress - 0.8) / 0.2;
      const easedU = u * u * (3 - 2 * u);
      // Deep zoom onto the Acoustic Ring, echoing the reference's close-up finale.
      targetHalfExtent = THREE.MathUtils.lerp(isMobile ? 2.2 : 1.7, isMobile ? 1.3 : 0.95, easedU);
      lookAtY = THREE.MathUtils.lerp(2.0, 4.6, easedU);
    }

    const targetZoom = zoomForHalfExtent(targetHalfExtent);
    state.camera.zoom = THREE.MathUtils.damp(state.camera.zoom, targetZoom, 7, delta);

    const camBase = 10;
    state.camera.position.set(
      camBase,
      THREE.MathUtils.damp(state.camera.position.y, camBase + lookAtY, 7, delta),
      camBase
    );

    const currentLookTarget = new THREE.Vector3(
      0,
      THREE.MathUtils.damp(state.camera.position.y - camBase, lookAtY, 7, delta),
      0
    );
    state.camera.lookAt(currentLookTarget);
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
            <Layer isWhiteTheme={isWhiteTheme} isHovered={hoveredId === layer.id} />
          </group>
        );
      })}
    </group>
  );
}
