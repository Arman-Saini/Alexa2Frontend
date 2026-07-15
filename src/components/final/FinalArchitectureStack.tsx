import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LayerGroup } from './FinalLayerGroup';
import { HeartFlow } from './pipeline/HeartFlow';
import { EffectsLayer } from './pipeline/EffectsLayer';
import { QUALITY_PRESETS, type Quality } from './pipeline/quality';
import type { ActiveEffect, PathNodeId } from './pipeline/types';

interface ArchitectureStackProps {
  ledColor: string;
  scrollProgress: number;
  dismantleMode?: boolean;
  debugCpuOffsetY?: number;
  debugCpuPhase2Y?: number;
  debugCpuRestingY?: number;
  debugCamPanX?: number;
  debugCamOffsetY?: number;
  debugCamPanZ?: number;
  debugCamZoom?: number;
  debugCamYaw?: number;
  debugCamPitch?: number;
  // ── Pipeline-demo props (all optional; defaults preserve /showcase exactly) ──
  /** Per-layer lift 0..1, fanned out to each LayerGroup's `lift`. */
  layerLifts?: number[];
  /** Per-layer label opacity floor 0..1, fanned out to `labelVisibility`. */
  labelVisibility?: number[];
  /** Current presentation focus. All other layers receive a soft dark veil. */
  focusLayer?: number | null;
  /** Per-layer label text overrides (null = keep the built-in text). */
  labelOverrides?: ({ title: string; desc: string } | null)[];
  /** Forces label light/dark styling on all layers. */
  labelTheme?: 'dark' | 'light';
  /** Heartbeat rate for the highlight plates' breathing glow. */
  pulseBpm?: number;
  /** Per-layer highlight plate tints (undefined entry = layer's ledColor). */
  highlightColors?: string[];
  /** Heart pump state — when provided, <HeartFlow/> renders inside the stack group. */
  heart?: { bpm: number; strength: number; flowPath: PathNodeId[] } | null;
  /** Active side-effect moments — when provided, <EffectsLayer/> renders inside the stack group. */
  effects?: ActiveEffect[];
  /** Render-quality tier for HeartFlow/EffectsLayer/highlight plates. */
  quality?: Quality;
  /** Accent color for the heart core + blood cells (default ledColor). */
  heartAccent?: string;
}

export function FinalArchitectureStack({
  ledColor,
  scrollProgress,
  dismantleMode = false,
  debugCpuOffsetY = 1.05,
  debugCpuPhase2Y = 1.18,
  debugCpuRestingY = 0.0,
  debugCamPanX = 0.0,
  debugCamOffsetY = 0.0,
  debugCamPanZ = 0.0,
  debugCamZoom = 90,
  debugCamYaw = 0.0,
  debugCamPitch = 0.0,
  layerLifts,
  labelVisibility,
  focusLayer,
  labelOverrides,
  labelTheme,
  pulseBpm,
  highlightColors,
  heart,
  effects,
  quality = 'high',
  heartAccent,
}: ArchitectureStackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  // Refs for tracking animated values to damp smoothly
  const currentCameraPos = useRef(new THREE.Vector3(0, 1.4, 5.2));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.4, 0));
  const currentZoom = useRef(1.0);
  const currentGroupPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentGroupRot = useRef(new THREE.Euler(0, 0, 0));
  const currentCameraUp = useRef(new THREE.Vector3(0, 1, 0));

  // Refs to track smooth transition from manual controls to automatic camera
  const transitionStartPos = useRef(new THREE.Vector3());
  const transitionStartLookAt = useRef(new THREE.Vector3());
  const transitionStartUp = useRef(new THREE.Vector3(0, 1, 0));
  const transitionStartZoom = useRef(1.0);
  const transitionStartTime = useRef(-1);
  const prevDismantleMode = useRef(false);

  // Temporary Math vectors to avoid allocations
  const targetCamPos = useMemo(() => new THREE.Vector3(), []);
  const targetGrpRot = useMemo(() => new THREE.Euler(), []);
  const targetGrpPos = useMemo(() => new THREE.Vector3(), []);
  const targetCameraUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state, delta) => {
    if (!dismantleMode) {
      if (groupRef.current) {
        groupRef.current.scale.set(0, 0, 0);
      }
      prevDismantleMode.current = false;
      return;
    }

    const s = scrollProgress;
    const elapsed = state.clock.getElapsedTime();

    // 1. Initialize transition when dismantle sequence is triggered
    if (!prevDismantleMode.current) {
      prevDismantleMode.current = true;
      transitionStartPos.current.copy(state.camera.position);
      transitionStartUp.current.copy(state.camera.up);
      transitionStartZoom.current = state.camera.zoom;
      transitionStartLookAt.current.set(0, 0, 0);
      transitionStartTime.current = elapsed;

      currentCameraPos.current.copy(state.camera.position);
      currentCameraUp.current.copy(state.camera.up);
      currentZoom.current = state.camera.zoom;
      currentLookAt.current.set(0, 0, 0);
    }

    // 2. CPU stack position and compact display scale. Layer coordinates are
    // authored for this scale; changing it would push the splayed row offscreen.
    let scaleVal = 0.20;
    let targetY = 0;

    if (s < 0.20) {
      // Sits inside opening bottom shell of Alexa: Y goes from start offset down to Phase 2 start Y offset
      const explodedProgress = s / 0.20;
      targetY = THREE.MathUtils.lerp(debugCpuOffsetY, debugCpuPhase2Y, explodedProgress);
      targetGrpPos.set(0, targetY, 0);
    } else if (s < 0.60) {
      // Floats up from Phase 2 start Y offset to Resting Y offset during Profile Sweep (s = 0.20 to 0.50)
      const t = Math.min(1, (s - 0.20) / 0.30);
      targetY = THREE.MathUtils.lerp(debugCpuPhase2Y, debugCpuRestingY, t);
      targetGrpPos.set(0, targetY, 0);
    } else if (s < 0.80) {
      targetY = debugCpuRestingY;
      targetGrpPos.set(0, targetY, 0);
    } else {
      const tClose = (s - 0.60) / 0.40;
      targetY = THREE.MathUtils.lerp(debugCpuRestingY, debugCpuOffsetY, tClose);
      targetGrpPos.set(0, targetY, 0);
    }

    // 3. Define camera position timeline and CPU group rotation to match /cpuanimation
    let targetZoomVal = 200;
    targetCameraUp.set(0, 1, 0);
    targetLookAt.set(0, 0, 0);

    if (s < 0.08) {
      // NEW PHASE: Zoom In (Scroll 0.0 -> 0.08, camera zooms in from 100 to 200)
      const t = s / 0.08;
      targetCamPos.set(0, 1.4, 8);
      targetZoomVal = THREE.MathUtils.lerp(100, 200, t);
      targetCameraUp.set(0, 1, 0);
      targetLookAt.set(0, targetY, 0);

      targetGrpRot.set(0, 0, 0);
    }
    else if (s < 0.20) {
      // PHASE 1: Rise and Flip (Scroll 0.08 -> 0.20, raised camera to view CPU inside Alexa)
      const t = (s - 0.08) / 0.12;
      targetCamPos.set(0, 1.4, 8);
      targetZoomVal = 200;
      targetCameraUp.set(0, 1, 0);
      targetLookAt.set(0, targetY, 0);

      targetGrpRot.set(THREE.MathUtils.lerp(0, Math.PI / 2, t), 0, 0);
    } 
    else if (s < 0.40) {
      // PHASE 2: Orbit Camera (Scroll 0.20 -> 0.40, raised camera)
      const t = (s - 0.20) / 0.20;
      const angle = t * (Math.PI / 2);
      const radius = 8;
      
      targetCamPos.set(radius * Math.sin(angle), 1.4 + t * 0.3, radius * Math.cos(angle));
      targetZoomVal = THREE.MathUtils.lerp(200, 240, t); // Zoomed closer to see the small CPU
      targetCameraUp.set(0, 1, 0);
      targetLookAt.set(0, targetY + 0.1 * t, 0);

      targetGrpRot.set(Math.PI / 2, 0, 0);
    } 
    else if (s < 0.50) {
      // PHASE 3: Horizontal Splay (Scroll 0.40 -> 0.50)
      const splayT = (s - 0.40) / 0.10;

      // Camera sweeps to top-down view (0, 30, 0.001)
      targetCamPos.set(
        THREE.MathUtils.lerp(8, 0, splayT),
        THREE.MathUtils.lerp(1.7, 30, splayT),
        THREE.MathUtils.lerp(0, 0.001, splayT)
      );
      
      targetZoomVal = THREE.MathUtils.lerp(240, 130, splayT); // Zoom closer than before
      targetCameraUp.set(0, THREE.MathUtils.lerp(1, 0, splayT), THREE.MathUtils.lerp(0, -1, splayT));
      targetLookAt.set(0, THREE.MathUtils.lerp(targetY + 0.1, 0, splayT), 0);

      targetGrpRot.set(THREE.MathUtils.lerp(Math.PI / 2, 0, splayT), 0, 0);
    }
    else if (s < 0.60) {
      // PHASE 4-6: Plateaus (Scroll 0.50 -> 0.60)
      targetCamPos.set(0, 30, 0.001);
      targetZoomVal = 130; // Closer top-down splay details view
      targetCameraUp.set(0, 0, -1);
      targetLookAt.set(0, 0, 0);
      
      targetGrpRot.set(0, 0, 0);
    }
    else if (s < 0.80) {
      // PHASE 5 (reverse of Phase 3): Unsplay — top-down collapses back to orbit view (0.60 -> 0.80)
      const unSplayT = (s - 0.60) / 0.20;

      targetCamPos.set(
        THREE.MathUtils.lerp(0, 8, unSplayT),
        THREE.MathUtils.lerp(30, 1.7, unSplayT),
        THREE.MathUtils.lerp(0.001, 0, unSplayT)
      );
      targetZoomVal = THREE.MathUtils.lerp(130, 240, unSplayT);
      targetCameraUp.set(0, THREE.MathUtils.lerp(0, 1, unSplayT), THREE.MathUtils.lerp(-1, 0, unSplayT));
      targetLookAt.set(0, THREE.MathUtils.lerp(0, targetY + 0.1, unSplayT), 0);

      targetGrpRot.set(THREE.MathUtils.lerp(0, Math.PI / 2, unSplayT), 0, 0);
    }
    else if (s < 0.92) {
      // PHASE 6 (reverse of Phase 2→1): De-orbit back to front view (0.80 -> 0.92)
      const tReturn = (s - 0.80) / 0.12;
      const angle = (1.0 - tReturn) * (Math.PI / 2); // mirrors entry orbit angle
      const radius = 8;

      targetCamPos.set(
        radius * Math.sin(angle),
        THREE.MathUtils.lerp(1.7, 1.4, tReturn),
        radius * Math.cos(angle)
      );
      targetZoomVal = 200;
      targetCameraUp.set(0, 1, 0);
      targetLookAt.set(0, THREE.MathUtils.lerp(targetY + 0.1, targetY, tReturn), 0);

      targetGrpRot.set(THREE.MathUtils.lerp(Math.PI / 2, 0, tReturn), 0, 0);
    }
    else {
      // NEW PHASE: Zoom Out (0.92 -> 1.00, camera zooms out from 200 to 100)
      const t = (s - 0.92) / 0.08;
      targetCamPos.set(0, 1.4, 8);
      targetZoomVal = THREE.MathUtils.lerp(200, 100, t);
      targetCameraUp.set(0, 1, 0);
      targetLookAt.set(0, targetY, 0);

      targetGrpRot.set(0, 0, 0);
    }

    const tBlend = Math.min(1, (elapsed - transitionStartTime.current) / 1.0);

    if (tBlend >= 1.0) {
      // 1. Calculate pan offset in local camera coordinates
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(state.camera.quaternion);
      const camForward = new THREE.Vector3(0, 0, 1).applyQuaternion(state.camera.quaternion);

      const panTotal = new THREE.Vector3()
        .addScaledVector(camRight, debugCamPanX)
        .addScaledVector(camUp, debugCamOffsetY)
        .addScaledVector(camForward, debugCamPanZ);

      // Shift both camera and target by the pan vector
      targetCamPos.add(panTotal);
      targetLookAt.add(panTotal);

      // 2. Rotate the camera position relative to targetLookAt (Orbit / Gyroscope Rotation)
      const relativePos = targetCamPos.clone().sub(targetLookAt);

      // Rotate yaw around world Y axis (0, 1, 0)
      relativePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), debugCamYaw);

      // Rotate pitch around camera local right axis
      relativePos.applyAxisAngle(camRight, debugCamPitch);

      // Set new camera position
      targetCamPos.copy(targetLookAt).add(relativePos);

      // 3. Apply zoom multiplier
      targetZoomVal = targetZoomVal * (debugCamZoom / 200);
    }

    const lambda = 8;

    if (groupRef.current) {
      // Apply scale
      groupRef.current.scale.set(scaleVal, scaleVal, scaleVal);

      // Damp position and rotation
      currentGroupPos.current.x = THREE.MathUtils.damp(currentGroupPos.current.x, targetGrpPos.x, lambda, delta);
      currentGroupPos.current.y = THREE.MathUtils.damp(currentGroupPos.current.y, targetGrpPos.y, lambda, delta);
      currentGroupPos.current.z = THREE.MathUtils.damp(currentGroupPos.current.z, targetGrpPos.z, lambda, delta);
      groupRef.current.position.copy(currentGroupPos.current);

      currentGroupRot.current.x = THREE.MathUtils.damp(currentGroupRot.current.x, targetGrpRot.x, lambda, delta);
      currentGroupRot.current.y = THREE.MathUtils.damp(currentGroupRot.current.y, targetGrpRot.y, lambda, delta);
      currentGroupRot.current.z = THREE.MathUtils.damp(currentGroupRot.current.z, targetGrpRot.z, lambda, delta);
      groupRef.current.rotation.copy(currentGroupRot.current);
    }

    // 4. Handle camera interpolation
    if (tBlend < 1.0) {
      const ease = THREE.MathUtils.smoothstep(tBlend, 0, 1);

      state.camera.position.lerpVectors(transitionStartPos.current, targetCamPos, ease);
      state.camera.up.lerpVectors(transitionStartUp.current, targetCameraUp, ease);
      state.camera.zoom = THREE.MathUtils.lerp(transitionStartZoom.current, targetZoomVal, ease);

      const lookAtTmp = new THREE.Vector3().lerpVectors(transitionStartLookAt.current, targetLookAt, ease);
      state.camera.lookAt(lookAtTmp);
      state.camera.updateProjectionMatrix();

      // Sync refs
      currentCameraPos.current.copy(state.camera.position);
      currentCameraUp.current.copy(state.camera.up);
      currentZoom.current = state.camera.zoom;
      currentLookAt.current.copy(lookAtTmp);
    } else {
      // Continuous smooth damping after lock completes
      currentCameraPos.current.x = THREE.MathUtils.damp(currentCameraPos.current.x, targetCamPos.x, lambda, delta);
      currentCameraPos.current.y = THREE.MathUtils.damp(currentCameraPos.current.y, targetCamPos.y, lambda, delta);
      currentCameraPos.current.z = THREE.MathUtils.damp(currentCameraPos.current.z, targetCamPos.z, lambda, delta);
      state.camera.position.copy(currentCameraPos.current);

      currentCameraUp.current.x = THREE.MathUtils.damp(currentCameraUp.current.x, targetCameraUp.x, lambda, delta);
      currentCameraUp.current.y = THREE.MathUtils.damp(currentCameraUp.current.y, targetCameraUp.y, lambda, delta);
      currentCameraUp.current.z = THREE.MathUtils.damp(currentCameraUp.current.z, targetCameraUp.z, lambda, delta);
      state.camera.up.copy(currentCameraUp.current);

      currentZoom.current = THREE.MathUtils.damp(currentZoom.current, targetZoomVal, lambda, delta);
      state.camera.zoom = currentZoom.current;

      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetLookAt.x, lambda, delta);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetLookAt.y, lambda, delta);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, targetLookAt.z, lambda, delta);
      state.camera.lookAt(currentLookAt.current);
      state.camera.updateProjectionMatrix();
    }

    if (gridRef.current) {
      const material = gridRef.current.material as THREE.Material & { opacity: number; transparent: boolean };
      material.transparent = true;

      // Grid only shows during splay phase, hidden during white section and at start/end
      if (s < 0.40) {
        material.opacity = 0;
      } else if (s < 0.50) {
        // Fade in during splay
        material.opacity = (s - 0.40) / 0.10;
      } else if (s < 0.51) {
        material.opacity = 1.0;
      } else if (s < 0.57) {
        // Fade out as white section begins
        material.opacity = Math.max(0, 1 - (s - 0.51) / 0.06);
      } else if (s < 0.74) {
        // Hidden during white section
        material.opacity = 0;
      } else if (s < 0.80) {
        // Fade back in during unsplay return
        material.opacity = (s - 0.74) / 0.06;
      } else {
        // Fade out as de-orbit completes — fully gone by s=1.0
        material.opacity = Math.max(0, 1 - (s - 0.80) / 0.20);
      }
      material.visible = material.opacity > 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Horizontal grid base pedestal to anchor the CPU block visually */}
      <gridHelper ref={gridRef} args={[8, 16, '#7a7168', '#b8afa4']} position={[0, -0.16, 0]} />

      {/* Renders each procedural layer of the hardware assembly */}
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <LayerGroup
          key={idx}
          index={idx}
          ledColor={ledColor}
          scrollProgress={scrollProgress}
          lift={layerLifts?.[idx]}
          microAnimBoost={layerLifts?.[idx]}
          labelVisibility={labelVisibility?.[idx]}
          dimmed={focusLayer != null && focusLayer !== idx}
          labelOverride={labelOverrides?.[idx] ?? undefined}
          labelTheme={labelTheme}
          pulseBpm={pulseBpm}
          highlightColor={highlightColors?.[idx]}
          plateBreathes={QUALITY_PRESETS[quality].plateBreathes}
        />
      ))}

      {/* Pipeline-demo overlays — mounted inside this same group so they
          inherit the stack's scale/rotation. Absent on /showcase (props
          undefined) so nothing new renders there. */}
      {heart && (
        <HeartFlow
          heart={heart}
          s={scrollProgress}
          accent={heartAccent ?? ledColor}
          quality={quality}
        />
      )}
      {effects && effects.length > 0 && (
        <EffectsLayer effects={effects} s={scrollProgress} quality={quality} />
      )}
    </group>
  );
}

export default FinalArchitectureStack;
