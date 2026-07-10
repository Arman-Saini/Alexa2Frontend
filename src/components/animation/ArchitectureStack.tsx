import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LayerGroup } from './LayerGroup';

interface ArchitectureStackProps {
  ledColor: string;
  scrollProgress: number;
}

export function ArchitectureStack({ ledColor, scrollProgress }: ArchitectureStackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  // Refs for tracking animated values to damp smoothly
  const currentCameraPos = useRef(new THREE.Vector3(0, 0.2, 8));
  const currentLookAtY = useRef(0);
  const currentZoom = useRef(40);
  const currentGroupPos = useRef(new THREE.Vector3(0, -1.5, 0));
  const currentGroupRot = useRef(new THREE.Euler(0, 0, 0));
  const currentCameraUp = useRef(new THREE.Vector3(0, 1, 0));

  // Temporary Math vectors to avoid allocations
  const targetCamPos = useMemo(() => new THREE.Vector3(), []);
  const targetGrpPos = useMemo(() => new THREE.Vector3(), []);
  const targetGrpRot = useMemo(() => new THREE.Euler(), []);
  const targetCameraUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((state, delta) => {
    const s = scrollProgress;
    let targetZoomVal = 90;
    let targetLookAtYVal = 0;

    if (s < 0.20) {
      // PHASE 1: Rise and Flip (Scroll 0.0 -> 0.20)
      const t = s / 0.20;
      
      targetCamPos.set(0, 0.2, 8);
      targetZoomVal = 90;
      targetLookAtYVal = 0.0;
      targetCameraUp.set(0, 1, 0);
      
      targetGrpPos.set(0, THREE.MathUtils.lerp(-1.5, 0.0, t), 0);
      targetGrpRot.set(THREE.MathUtils.lerp(0, Math.PI / 2, t), 0, 0);
    } 
    else if (s < 0.40) {
      // PHASE 2: Orbit Camera (Scroll 0.20 -> 0.40)
      const t = (s - 0.20) / 0.20;
      const angle = t * (Math.PI / 2);
      const radius = 8;
      
      targetCamPos.set(radius * Math.sin(angle), 0.2 + t * 0.3, radius * Math.cos(angle));
      targetZoomVal = 100;
      targetLookAtYVal = 0.1 * t;
      targetCameraUp.set(0, 1, 0);

      targetGrpPos.set(0, 0, 0);
      targetGrpRot.set(Math.PI / 2, 0, 0);
    } 
    else if (s < 0.50) {
      // PHASE 3: Horizontal Splay (Scroll 0.40 -> 0.50)
      const splayT = (s - 0.40) / 0.10;

      // Camera sweeps from profile angle to directly top-down (0, 30, 0.001)
      targetCamPos.set(
        THREE.MathUtils.lerp(8, 0, splayT),
        THREE.MathUtils.lerp(0.5, 30, splayT),
        THREE.MathUtils.lerp(0, 0.001, splayT)
      );
      
      targetZoomVal = THREE.MathUtils.lerp(100, 42, splayT);
      targetLookAtYVal = THREE.MathUtils.lerp(0.1, 0, splayT);
      targetCameraUp.set(0, THREE.MathUtils.lerp(1, 0, splayT), THREE.MathUtils.lerp(0, -1, splayT));

      targetGrpPos.set(0, 0, 0);
      targetGrpRot.set(THREE.MathUtils.lerp(Math.PI / 2, 0, splayT), 0, 0);
    }
    else if (s < 0.80) {
      // PHASE 4-6: Plateaus (Scroll 0.50 -> 0.80)
      targetCamPos.set(0, 30, 0.001);
      targetZoomVal = 42;
      targetLookAtYVal = 0;
      targetCameraUp.set(0, 0, -1);
      
      targetGrpPos.set(0, 0, 0);
      targetGrpRot.set(0, 0, 0);
    }
    else {
      // PHASE 7: Sequential Joining (Scroll 0.80 -> 1.00)
      // Camera tilts to angled view to showcase the stack thickness as it assembles
      const camT = Math.min(1, (s - 0.80) / 0.05);
      
      targetCamPos.set(
        THREE.MathUtils.lerp(0, 4.5, camT),
        THREE.MathUtils.lerp(30, 5.0, camT),
        THREE.MathUtils.lerp(0.001, 6.0, camT)
      );
      targetZoomVal = THREE.MathUtils.lerp(42, 75, camT);
      targetLookAtYVal = THREE.MathUtils.lerp(0, 0.4, camT);
      targetCameraUp.set(
        0,
        THREE.MathUtils.lerp(0, 1, camT),
        THREE.MathUtils.lerp(-1, 0, camT)
      );
      
      targetGrpPos.set(0, 0, 0);
      targetGrpRot.set(0, 0, 0);
    }

    const lambda = 8;

    // Damp camera position
    currentCameraPos.current.x = THREE.MathUtils.damp(currentCameraPos.current.x, targetCamPos.x, lambda, delta);
    currentCameraPos.current.y = THREE.MathUtils.damp(currentCameraPos.current.y, targetCamPos.y, lambda, delta);
    currentCameraPos.current.z = THREE.MathUtils.damp(currentCameraPos.current.z, targetCamPos.z, lambda, delta);
    state.camera.position.copy(currentCameraPos.current);

    // Damp camera up vector
    currentCameraUp.current.x = THREE.MathUtils.damp(currentCameraUp.current.x, targetCameraUp.x, lambda, delta);
    currentCameraUp.current.y = THREE.MathUtils.damp(currentCameraUp.current.y, targetCameraUp.y, lambda, delta);
    currentCameraUp.current.z = THREE.MathUtils.damp(currentCameraUp.current.z, targetCameraUp.z, lambda, delta);
    state.camera.up.copy(currentCameraUp.current);

    // Damp camera zoom
    currentZoom.current = THREE.MathUtils.damp(currentZoom.current, targetZoomVal, lambda, delta);
    state.camera.zoom = currentZoom.current;

    // Damp camera lookAt target
    currentLookAtY.current = THREE.MathUtils.damp(currentLookAtY.current, targetLookAtYVal, lambda, delta);
    state.camera.lookAt(0, currentLookAtY.current, 0);
    state.camera.updateProjectionMatrix();

    if (groupRef.current) {
      currentGroupPos.current.x = THREE.MathUtils.damp(currentGroupPos.current.x, targetGrpPos.x, lambda, delta);
      currentGroupPos.current.y = THREE.MathUtils.damp(currentGroupPos.current.y, targetGrpPos.y, lambda, delta);
      currentGroupPos.current.z = THREE.MathUtils.damp(currentGroupPos.current.z, targetGrpPos.z, lambda, delta);
      groupRef.current.position.copy(currentGroupPos.current);

      currentGroupRot.current.x = THREE.MathUtils.damp(currentGroupRot.current.x, targetGrpRot.x, lambda, delta);
      currentGroupRot.current.y = THREE.MathUtils.damp(currentGroupRot.current.y, targetGrpRot.y, lambda, delta);
      currentGroupRot.current.z = THREE.MathUtils.damp(currentGroupRot.current.z, targetGrpRot.z, lambda, delta);
      groupRef.current.rotation.copy(currentGroupRot.current);
    }

    // Fade out the flat pedestal grid once the stack starts splaying — it's
    // sized for the single flat card in Phase 1 and just clutters the
    // exploded Phase 3 layout otherwise.
    if (gridRef.current) {
      const material = gridRef.current.material as THREE.Material & { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = 1 - THREE.MathUtils.smoothstep(s, 0.55, 0.7);
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
        />
      ))}
    </group>
  );
}

export default ArchitectureStack;
