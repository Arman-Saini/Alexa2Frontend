import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EngineAssemblyProps {
  expression: 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
  bodyColor: string;
  ledColor: string;
  ledMode: 'solid' | 'pulse' | 'wave' | 'off';
  outlineThickness: number;
  explodedProgress: number; // 0 to 1
  isHovered: boolean;
  isClicked: boolean;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  isSpeaking: boolean;
  isSinging: boolean;
}

export function EngineAssembly({
  expression,
  bodyColor,
  ledColor,
  ledMode,
  outlineThickness,
  explodedProgress,
  isHovered,
  isPanelOpen,
  setIsPanelOpen,
  isSpeaking,
  isSinging,
}: EngineAssemblyProps) {
  const robotGroupRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Group>(null);
  const ledGroupRef = useRef<THREE.Group>(null);
  const ledRingRef = useRef<THREE.Group>(null);
  const ledLightRef = useRef<THREE.PointLight>(null);
  const eyesGroupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const hingeRef = useRef<THREE.Group>(null);
  const chipRef = useRef<THREE.Group>(null);
  const leftEyeGroupRef = useRef<THREE.Group>(null);
  const rightEyeGroupRef = useRef<THREE.Group>(null);
  const yawnMouthRef = useRef<THREE.Group>(null);
  const leftYawnAwakeRef = useRef<THREE.Group>(null);
  const leftYawnClosedRef = useRef<THREE.Group>(null);
  const rightYawnAwakeRef = useRef<THREE.Group>(null);
  const rightYawnClosedRef = useRef<THREE.Group>(null);
  const yawnMouthOpenRef = useRef<THREE.Group>(null);
  const yawnMouthClosedRef = useRef<THREE.Group>(null);
  const lookXRef = useRef(0);
  const lookYRef = useRef(0);

  // Group references for leader lines projection
  const headRef = useRef<THREE.Group>(null);
  const lensRef = useRef<THREE.Group>(null);
  const gearLargeRef = useRef<THREE.Group>(null);
  const gearSmallRef = useRef<THREE.Group>(null);
  const baseRef = useRef<THREE.Group>(null);

  // Colors parsed to THREE formats
  const mainColor = useMemo(() => new THREE.Color(bodyColor), [bodyColor]);
  const outlineColor = useMemo(() => new THREE.Color('#141312'), []);
  const ledThreeColor = useMemo(() => new THREE.Color(ledColor), [ledColor]);

  // Procedural singing states to show effort
  const [singingState, setSingingState] = useState({
    leftEye: 'happy',
    rightEye: 'happy',
    mouth: 'happy',
  });
  const lastSingingChangeRef = useRef(0);

  // Random blinking together states (idle state)
  const [isBlinking, setIsBlinking] = useState(false);
  const nextBlinkTimeRef = useRef(3.0); // first blink around 3 seconds
  const blinkEndRef = useRef(0);

  // Dizzy face timer/cooldown when reassembled
  const [showDizzyCooldown, setShowDizzyCooldown] = useState(false);
  const showDizzyCooldownRef = useRef(false);

  // Gears rotation refs
  const bladesRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (explodedProgress > 0) {
      const timer = setTimeout(() => {
        setShowDizzyCooldown(true);
        showDizzyCooldownRef.current = true;
      }, 0);
      return () => clearTimeout(timer);
    } else if (explodedProgress === 0 && showDizzyCooldownRef.current) {
      const timer = setTimeout(() => {
        setShowDizzyCooldown(false);
        showDizzyCooldownRef.current = false;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [explodedProgress]);

  // Handle procedural animations (hover floating, singing dance, led pulse/wave, antenna wiggle, camera face-tracking)
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (robotGroupRef.current && explodedProgress === 0) {
      if (isSinging) {
        // Upbeat medium-tempo singing dance (lively but not jittery)
        const danceX = Math.sin(t * 2.8) * 0.14; // Brisk sideways sway
        const danceY = 1.1 + Math.cos(t * 4.2) * 0.07; // Uplifting double-beat bobbing
        const danceTiltZ = Math.sin(t * 2.8) * 0.06; // Dynamic sway tilt

        robotGroupRef.current.position.x = danceX;
        robotGroupRef.current.position.y = danceY;
        robotGroupRef.current.rotation.x = Math.cos(t * 2.8) * 0.02;
        robotGroupRef.current.rotation.z = danceTiltZ;
        robotGroupRef.current.scale.set(1, 1, 1);
      } else if (expression === 'yawning') {
        // Squash and stretch scale calculation
        const cycleTime = t % 5.0; // 5-second loop
        let scaleY: number;
        let scaleX: number;
        let scaleZ: number;
        let hoverHeight: number;

        if (cycleTime < 1.0) {
          const progress = cycleTime / 1.0;
          scaleY = 1.0;
          scaleX = 1.0;
          scaleZ = 1.0;
          hoverHeight = -progress * 0.04;
        } else if (cycleTime < 1.4) {
          const progress = (cycleTime - 1.0) / 0.4;
          const ease = Math.sin((progress * Math.PI) / 2);
          scaleY = 1.0 - ease * 0.12; // down to 0.88
          scaleX = 1.0 + ease * 0.08; // up to 1.08
          scaleZ = 1.0 + ease * 0.08;
          hoverHeight = -0.04 - ease * 0.06; // dips down to -0.10
        } else if (cycleTime < 2.0) {
          const progress = (cycleTime - 1.4) / 0.6;
          const ease = Math.sin((progress * Math.PI) / 2);
          const shake = Math.sin(t * 50) * 0.012; // tremor
          scaleY = 0.88 + ease * 0.44 + shake; // stretches to 1.32
          scaleX = 1.08 - ease * 0.26 - shake * 0.5; // shrinks to 0.82
          scaleZ = 1.08 - ease * 0.26 - shake * 0.5;
          hoverHeight = -0.10 + ease * 0.20; // rises up
        } else if (cycleTime < 2.8) {
          const progress = (cycleTime - 2.0) / 0.8;
          if (progress < 0.4) {
            const p = progress / 0.4;
            scaleY = 1.32 - p * 0.44; // dips to 0.88
            scaleX = 0.82 + p * 0.28; // goes to 1.10
            scaleZ = 0.82 + p * 0.28;
            hoverHeight = 0.10 - p * 0.20; // down to -0.10
          } else {
            const p = (progress - 0.4) / 0.6;
            scaleY = 0.88 + p * 0.08; // rises to 0.96
            scaleX = 1.10 - p * 0.06; // goes to 1.04
            scaleZ = 1.10 - p * 0.06;
            hoverHeight = -0.10 + p * 0.02; // settles at -0.08
          }
        } else {
          const progress = (cycleTime - 2.8) / 2.2;
          const breathe = Math.sin(progress * Math.PI * 2); // 1 full breath cycle
          scaleY = 0.96 + breathe * 0.025; // pulses between 0.935 and 0.985
          scaleX = 1.04 - breathe * 0.015; // pulses between 1.025 and 1.055
          scaleZ = 1.04 - breathe * 0.015;
          hoverHeight = -0.08 + breathe * 0.02;
        }

        robotGroupRef.current.position.x = 0;
        robotGroupRef.current.position.y = 1.1 + hoverHeight;
        robotGroupRef.current.rotation.set(0, 0, 0);
        robotGroupRef.current.scale.set(scaleX, scaleY, scaleZ);

        const isAwakePhase = cycleTime < 0.6;
        if (leftYawnAwakeRef.current) leftYawnAwakeRef.current.visible = isAwakePhase;
        if (leftYawnClosedRef.current) leftYawnClosedRef.current.visible = !isAwakePhase;
        if (rightYawnAwakeRef.current) rightYawnAwakeRef.current.visible = isAwakePhase;
        if (rightYawnClosedRef.current) rightYawnClosedRef.current.visible = !isAwakePhase;
      } else {
        // Gentle floating loop
        const hoverHeight = Math.sin(t * 2.0) * 0.05;
        const hoverTiltX = Math.cos(t * 1.5) * 0.015;
        const hoverTiltZ = Math.sin(t * 1.2) * 0.015;

        robotGroupRef.current.position.x = 0;
        robotGroupRef.current.position.y = 1.1 + hoverHeight;
        robotGroupRef.current.rotation.x = hoverTiltX + (isHovered ? 0.03 : 0);
        robotGroupRef.current.rotation.z = hoverTiltZ;
        robotGroupRef.current.scale.set(1, 1, 1);
      }
    } else if (robotGroupRef.current) {
      robotGroupRef.current.position.set(0, 1.1, 0);
      robotGroupRef.current.rotation.set(0, 0, 0);
      robotGroupRef.current.scale.set(1, 1, 1);
    }

    // Antenna wiggle
    if (antennaRef.current) {
      const wiggleSpeed = isSinging ? 10.0 : (isHovered ? 12 : 4);
      const wiggleAmp = isSinging ? 0.22 : (isHovered ? 0.25 : 0.08);
      antennaRef.current.rotation.z = Math.sin(t * wiggleSpeed) * wiggleAmp;
      antennaRef.current.rotation.x = Math.cos(t * wiggleSpeed * 0.7) * wiggleAmp * 0.5;
    }

    // LED base light ring animations
    if (ledRingRef.current) {
      if (ledMode === 'off') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        if (ledMaterial) ledMaterial.opacity = 0.05;
        if (ledLightRef.current) ledLightRef.current.intensity = 0;
        ledRingRef.current.rotation.z = 0;
      } else if (ledMode === 'solid') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        if (ledMaterial) ledMaterial.opacity = 1.0;
        if (ledLightRef.current) ledLightRef.current.intensity = 2.0;
        ledRingRef.current.rotation.z = 0;
      } else if (ledMode === 'pulse') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        const pulse = 0.5 + Math.sin(t * 3.5) * 0.5;
        if (ledMaterial) ledMaterial.opacity = 0.3 + pulse * 0.7;
        if (ledLightRef.current) ledLightRef.current.intensity = 0.4 + pulse * 1.6;
        ledRingRef.current.rotation.z = 0;
      } else if (ledMode === 'wave') {
        ledRingRef.current.rotation.z = -t * 5.0;
        if (ledLightRef.current) {
          ledLightRef.current.intensity = 1.8;
        }
      }
    }

    // Smooth door hinging
    if (hingeRef.current) {
      const targetHingeRot = isPanelOpen ? -Math.PI * 0.65 : 0;
      hingeRef.current.rotation.y = THREE.MathUtils.lerp(hingeRef.current.rotation.y, targetHingeRot, 0.12);
    }

    // Smooth chip pop-up
    if (chipRef.current) {
      const targetChipZ = isPanelOpen ? 0.09 : -0.06;
      chipRef.current.position.z = THREE.MathUtils.lerp(chipRef.current.position.z, targetChipZ, 0.1);
    }

    // Dynamic expression switcher during singing
    if (isSinging) {
      if (isBlinking) setIsBlinking(false);
      if (t - lastSingingChangeRef.current > 2.2) {
        lastSingingChangeRef.current = t;
        const eyeRandom = Math.random();
        let nextEye: string;
        if (eyeRandom < 0.33) {
          nextEye = 'sleepy';
        } else if (eyeRandom < 0.66) {
          nextEye = 'curious';
        } else {
          nextEye = 'happy';
        }
        const nextMouth = Math.random() < 0.5 ? 'happy' : 'curious';
        setSingingState({
          leftEye: nextEye,
          rightEye: nextEye,
          mouth: nextMouth,
        });
      }
    }

    // Idle Random Blinking
    if (!isSinging && explodedProgress === 0) {
      if (t > nextBlinkTimeRef.current) {
        setIsBlinking(true);
        blinkEndRef.current = t + 0.12;
        nextBlinkTimeRef.current = t + 2.0 + Math.random() * 4.0;
      }
      if (isBlinking && t > blinkEndRef.current) {
        setIsBlinking(false);
      }
    }

    // Smooth speaking/singing mouth mimic
    if (mouthRef.current) {
      if (isSinging) {
        const talkY = 0.6 + Math.sin(t * 7.5) * 0.4;
        const talkX = 1.0 + Math.cos(t * 5.5) * 0.12;
        const mouthTilt = Math.sin(t * 2.8) * 0.06;
        mouthRef.current.scale.set(talkX, talkY, 1);
        mouthRef.current.rotation.z = mouthTilt;
      } else if (isSpeaking) {
        const talkY = 0.5 + Math.abs(Math.sin(t * 8.5)) * 0.6;
        const talkX = 1.0 + Math.sin(t * 6.5) * 0.1;
        mouthRef.current.scale.set(talkX, talkY, 1);
        mouthRef.current.rotation.z = 0;
      } else if (expression === 'sleepy') {
        const cycleTime = t % 3.0;
        let scaleY: number;
        let scaleX: number;
        if (cycleTime < 0.8) {
          const progress = cycleTime / 0.8;
          scaleY = 0.5 + progress * 2.0;
          scaleX = 0.5 + progress * 1.3;
        } else if (cycleTime < 2.0) {
          scaleY = 2.5 + Math.sin(t * 30) * 0.08;
          scaleX = 1.8 + Math.cos(t * 25) * 0.05;
        } else {
          const progress = (cycleTime - 2.0) / 1.0;
          scaleY = 2.5 - progress * 2.0;
          scaleX = 1.8 - progress * 1.3;
        }
        mouthRef.current.scale.set(scaleX, scaleY, 1.0);
        mouthRef.current.rotation.z = 0;
      } else {
        mouthRef.current.scale.set(1, 1, 1);
        mouthRef.current.rotation.z = 0;
      }
    }

    // Smooth yawning mouth animation
    if (expression === 'yawning' && yawnMouthRef.current) {
      const cycleTime = t % 5.0;
        let scaleY: number;
        let scaleX: number;
        let showClosed: boolean;

      if (cycleTime < 0.4) {
        scaleY = 1.0;
        scaleX = 1.0;
        showClosed = true;
      } else if (cycleTime < 1.0) {
        const progress = (cycleTime - 0.4) / 0.6;
        scaleY = 0.3 + progress * 2.7;
        scaleX = 0.3 + progress * 1.7;
        showClosed = false;
      } else if (cycleTime < 2.1) {
        scaleY = 3.0 + Math.sin(t * 30) * 0.08;
        scaleX = 2.0 + Math.cos(t * 25) * 0.05;
        showClosed = false;
      } else if (cycleTime < 2.8) {
        const progress = (cycleTime - 2.1) / 0.7;
        scaleY = 3.0 - progress * 2.7;
        scaleX = 2.0 - progress * 1.7;
        showClosed = progress > 0.8;
      } else {
        const progress = (cycleTime - 2.8) / 2.2;
        const breathe = Math.sin(progress * Math.PI * 2);
        scaleY = 0.5 + breathe * 0.1;
        scaleX = 0.5 + breathe * 0.1;
        showClosed = true;
      }

      yawnMouthRef.current.scale.set(scaleX, scaleY, 1.0);
      if (yawnMouthClosedRef.current) yawnMouthClosedRef.current.visible = showClosed;
      if (yawnMouthOpenRef.current) yawnMouthOpenRef.current.visible = !showClosed;
    }

    // Smooth eye cursor tracking or dizzy spinning animation
    const isDizzy = explodedProgress > 0 || showDizzyCooldown;

    if (isDizzy) {
      if (leftEyeGroupRef.current) {
        leftEyeGroupRef.current.position.set(0, 0, 0);
        leftEyeGroupRef.current.rotation.z = t * 6.0;
      }
      if (rightEyeGroupRef.current) {
        rightEyeGroupRef.current.position.set(0, 0, 0);
        rightEyeGroupRef.current.rotation.z = -t * 6.0;
      }
      if (eyesGroupRef.current) {
        eyesGroupRef.current.rotation.set(0, 0, 0);
      }

      if (showDizzyCooldown && explodedProgress === 0 && robotGroupRef.current) {
        robotGroupRef.current.rotation.z = Math.sin(t * 16.0) * 0.08;
        robotGroupRef.current.rotation.x = Math.cos(t * 13.0) * 0.05;
        robotGroupRef.current.rotation.y = Math.sin(t * 9.0) * 0.05;
      } else if (robotGroupRef.current) {
        robotGroupRef.current.rotation.set(0, 0, 0);
      }
    } else {
      const targetLookX = state.pointer.x * 0.07;
      const targetLookY = state.pointer.y * 0.06;
      lookXRef.current = THREE.MathUtils.lerp(lookXRef.current, targetLookX, 0.1);
      lookYRef.current = THREE.MathUtils.lerp(lookYRef.current, targetLookY, 0.1);

      if (leftEyeGroupRef.current) {
        leftEyeGroupRef.current.position.x = lookXRef.current;
        leftEyeGroupRef.current.position.y = lookYRef.current;
        leftEyeGroupRef.current.rotation.z = 0;
      }
      if (rightEyeGroupRef.current) {
        rightEyeGroupRef.current.position.x = lookXRef.current;
        rightEyeGroupRef.current.position.y = lookYRef.current;
        rightEyeGroupRef.current.rotation.z = 0;
      }
      if (eyesGroupRef.current) {
        eyesGroupRef.current.rotation.set(0, 0, 0);
      }
      if (robotGroupRef.current) {
        robotGroupRef.current.rotation.set(0, 0, 0);
      }
    }

    // Animate inner aperture blades closing/opening
    if (bladesRef.current) {
      const children = bladesRef.current.children;
      const rotationAngle = (1.0 - explodedProgress) * 0.45;
      children.forEach((child, i) => {
        child.rotation.z = rotationAngle + (i * Math.PI * 2) / 6;
      });
    }

    // Animate leader line screen projections
    const lineLayers = [
      { id: 'head', ref: headRef },
      { id: 'lens', ref: lensRef },
      { id: 'gearLarge', ref: gearLargeRef },
      { id: 'gearSmall', ref: gearSmallRef },
      { id: 'base', ref: baseRef },
    ];

    lineLayers.forEach((layer) => {
      const ref = layer.ref.current;
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

      const fadeIn = THREE.MathUtils.clamp((explodedProgress - 0.1) / 0.2, 0, 1);
      const fadeOut = 1.0 - THREE.MathUtils.clamp((explodedProgress - 0.9) / 0.1, 0, 1);
      const drawProgress = fadeIn * fadeOut;

      line.setAttribute('x1', `${screenX}`);
      line.setAttribute('y1', `${screenY}`);
      line.setAttribute('x2', `${THREE.MathUtils.lerp(screenX, targetX, drawProgress)}`);
      line.setAttribute('y2', `${THREE.MathUtils.lerp(screenY, targetY, drawProgress)}`);
      line.setAttribute('opacity', `${drawProgress * 0.6}`);
    });
  });

  // Resolve active expressions
  const [leftEyeToShow, rightEyeToShow] = useMemo(() => {
    if (explodedProgress > 0 || showDizzyCooldown) {
      return ['dizzy', 'dizzy'];
    }
    if (isBlinking) {
      return ['sleepy', 'sleepy'];
    }
    if (isSinging) {
      return [singingState.leftEye, singingState.rightEye];
    }
    switch (expression) {
      case 'resting':
        return ['curious', 'curious'];
      case 'wink':
        return ['happy', 'curious'];
      case 'sleepy':
        return ['sleepy-squint', 'sleepy-squint'];
      default:
        return [expression, expression];
    }
  }, [expression, isSinging, singingState.leftEye, singingState.rightEye, isBlinking, explodedProgress, showDizzyCooldown]);

  const mouthToShow = useMemo(() => {
    if (explodedProgress > 0 || showDizzyCooldown) {
      return 'dizzy';
    }
    if (isSinging) {
      return singingState.mouth;
    }
    if (expression === 'resting') {
      return 'happy';
    }
    return expression;
  }, [expression, isSinging, singingState.mouth, explodedProgress, showDizzyCooldown]);

  // Toon materials
  const toonMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: mainColor }), [mainColor]);
  const outlineMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: outlineColor, side: THREE.BackSide }), [outlineColor]);
  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#08080a' }), []);
  const faceGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);
  const buttonBaseMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e6dfd5' }), []);
  const chipGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f1c40f', toneMapped: false }), []);

  // Web color theme matching materials for gears/cogs (instead of liquid glass)
  const gearMaterialLarge = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e9b44c' }), []); // Pippo yellow/orange
  const gearMaterialSmall = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a7ca5' }), []); // Doraemon blue
  const lensRingMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4a4844' }), []);

  const scaleFactor = 1.0 + outlineThickness * 0.025;
  const outlineScale = [scaleFactor, scaleFactor, scaleFactor] as [number, number, number];

  // Symmetrical split slide positions
  const yHead = explodedProgress * 2.2;
  const yBase = -explodedProgress * 2.2;

  return (
    <group ref={robotGroupRef}>
      {/* 1. TOP SPHERICAL HEAD (slides up) */}
      <group ref={headRef} position={[0, yHead, 0]}>
        {/* Uncut Dome in Assembled state */}
        {explodedProgress === 0 && (
          <group position={[0, 0, 0]}>
            <mesh>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, 2.50]} />
              <primitive object={toonMaterial} attach="material" />
            </mesh>
            <mesh scale={outlineScale}>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, 2.50]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>
          </group>
        )}

        {/* Top Dome (opens like a lid when exploded) */}
        <group position={[0, 0.26, -1.11]}>
          <group rotation={[-explodedProgress * Math.PI * 0.45, 0, 0]}>
            <group position={[0, -0.26, 1.11]}>
              {explodedProgress > 0 && (
                <>
                  <mesh>
                    <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={toonMaterial} attach="material" />
                  </mesh>
                  <mesh scale={outlineScale}>
                    <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={outlineMaterial} attach="material" />
                  </mesh>
                  
                  {/* Flat base cap under top hemisphere */}
                  <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <circleGeometry args={[1.2, 32]} />
                    <primitive object={toonMaterial} attach="material" />
                  </mesh>
                  <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[outlineScale[0], outlineScale[1], 1]}>
                    <circleGeometry args={[1.2, 32]} />
                    <primitive object={outlineMaterial} attach="material" />
                  </mesh>
                </>
              )}

              {/* Antenna */}
              <group ref={antennaRef} position={[0, 1.2, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
                  <primitive object={toonMaterial} attach="material" />
                </mesh>
                <mesh scale={outlineScale}>
                  <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>

                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                  <primitive object={buttonBaseMaterial} attach="material" />
                </mesh>
                <mesh position={[0, 0.2, 0]} scale={[outlineScale[0] * 1.5, outlineScale[1], outlineScale[2] * 1.5]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>

                <mesh position={[0, 0.42, 0]}>
                  <sphereGeometry args={[0.075, 16, 16]} />
                  <meshBasicMaterial color="#3da5e0" />
                </mesh>
                <mesh position={[0, 0.42, 0]} scale={outlineScale}>
                  <sphereGeometry args={[0.075, 16, 16]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>
              </group>

              {/* Glowing Eyes */}
              <group ref={eyesGroupRef}>
                {/* Left Eye */}
                <group ref={leftEyeGroupRef}>
                  {leftEyeToShow === 'happy' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                      <mesh>
                        <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'curious' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                      <mesh>
                        <ringGeometry args={[0.05, 0.09, 24]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'sleepy' && (
                    <group position={[-0.24, 0.10, 1.22]} rotation={[0, -0.2, 0]}>
                      <mesh>
                        <boxGeometry args={[0.18, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'dizzy' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                      <mesh rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.16, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh rotation={[0, 0, -Math.PI / 4]}>
                        <boxGeometry args={[0.16, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'excited' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, Math.PI]}>
                      <mesh position={[-0.04, 0, 0]} rotation={[0, 0, 0.5]}>
                        <boxGeometry args={[0.12, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh position={[0.04, 0, 0]} rotation={[0, 0, -0.5]}>
                        <boxGeometry args={[0.12, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'sad' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, Math.PI]}>
                      <mesh>
                        <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'sleepy-squint' && (
                    <group position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                      <mesh position={[0, 0.025, 0]} rotation={[0, 0, Math.PI / 5]}>
                        <boxGeometry args={[0.16, 0.024, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh position={[0, -0.025, 0]} rotation={[0, 0, -Math.PI / 5]}>
                        <boxGeometry args={[0.16, 0.024, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {leftEyeToShow === 'yawning' && (
                    <group>
                      <group ref={leftYawnAwakeRef} position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                        <mesh>
                          <ringGeometry args={[0.05, 0.09, 24]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                      <group ref={leftYawnClosedRef} position={[-0.24, 0.10, 1.22]} rotation={[0, -0.2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.20, 0.022, 0.01]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                    </group>
                  )}
                </group>

                {/* Right Eye */}
                <group ref={rightEyeGroupRef}>
                  {rightEyeToShow === 'happy' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                      <mesh>
                        <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'curious' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                      <mesh>
                        <ringGeometry args={[0.05, 0.09, 24]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'sleepy' && (
                    <group position={[0.24, 0.10, 1.22]} rotation={[0, 0.2, 0]}>
                      <mesh>
                        <boxGeometry args={[0.18, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'dizzy' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                      <mesh rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.16, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh rotation={[0, 0, -Math.PI / 4]}>
                        <boxGeometry args={[0.16, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'excited' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, Math.PI]}>
                      <mesh position={[-0.04, 0, 0]} rotation={[0, 0, 0.5]}>
                        <boxGeometry args={[0.12, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh position={[0.04, 0, 0]} rotation={[0, 0, -0.5]}>
                        <boxGeometry args={[0.12, 0.03, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'sad' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, Math.PI]}>
                      <mesh>
                        <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'sleepy-squint' && (
                    <group position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                      <mesh position={[0, 0.025, 0]} rotation={[0, 0, -Math.PI / 5]}>
                        <boxGeometry args={[0.16, 0.024, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                      <mesh position={[0, -0.025, 0]} rotation={[0, 0, Math.PI / 5]}>
                        <boxGeometry args={[0.16, 0.024, 0.01]} />
                        <primitive object={faceGlowMaterial} attach="material" />
                      </mesh>
                    </group>
                  )}
                  {rightEyeToShow === 'yawning' && (
                    <group>
                      <group ref={rightYawnAwakeRef} position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                        <mesh>
                          <ringGeometry args={[0.05, 0.09, 24]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                      <group ref={rightYawnClosedRef} position={[0.24, 0.10, 1.22]} rotation={[0, 0.2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.20, 0.022, 0.01]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                    </group>
                  )}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* 2. BOTTOM SPHERICAL BODY (slides down, revealing nested components inside Y-cavity) */}
      <group position={[0, yBase, 0]}>
        {/* Uncut bottom dome in Assembled state */}
        {explodedProgress === 0 && (
          <group position={[0, 0, 0]}>
            <mesh>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <primitive object={toonMaterial} attach="material" />
            </mesh>
            <mesh scale={outlineScale}>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>
          </group>
        )}

        {/* Bottom Dome shell when split */}
        {explodedProgress > 0 && (
          <group ref={baseRef}>
            <mesh>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <primitive object={toonMaterial} attach="material" />
            </mesh>
            <mesh scale={outlineScale}>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>

            {/* Flat top circle cap of bottom cup */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <circleGeometry args={[1.2, 32]} />
              <primitive object={toonMaterial} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[outlineScale[0], outlineScale[1], 1]}>
              <circleGeometry args={[1.2, 32]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>
          </group>
        )}

        {/* Mouth (attached to bottom half) */}
        <group ref={mouthRef}>
          {mouthToShow === 'happy' && (
            <group position={[0, -0.16, 1.225]} rotation={[0.13, 0, 0]}>
              <mesh>
                <circleGeometry args={[0.16, 32, Math.PI, Math.PI]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'curious' && (
            <group position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
              <mesh>
                <ringGeometry args={[0.03, 0.07, 24]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'wink' && (
            <group position={[0, -0.16, 1.225]} rotation={[0.13, 0, 0]}>
              <mesh>
                <circleGeometry args={[0.16, 32, Math.PI, Math.PI]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'sleepy' && (
            <group position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
              <mesh>
                <ringGeometry args={[0.02, 0.07, 32]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'dizzy' && (
            <group position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[0.03, 0.07, 4]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'excited' && (
            <group position={[0, -0.12, 1.225]} rotation={[0.1, 0, 0]}>
              <mesh>
                <circleGeometry args={[0.22, 32, Math.PI, Math.PI]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'sad' && (
            <group position={[0, -0.15, 1.225]} rotation={[0.12, 0, 0]}>
              <mesh>
                <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          )}
          {mouthToShow === 'yawning' && (
            <group ref={yawnMouthRef} position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
              <group ref={yawnMouthOpenRef}>
                <mesh>
                  <ringGeometry args={[0.01, 0.07, 32]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
              <group ref={yawnMouthClosedRef}>
                <mesh>
                  <ringGeometry args={[0.02, 0.045, 16]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            </group>
          )}
        </group>

        {/* Back Panel Cavity Motherboard */}
        <group rotation={[0, Math.PI, 0]}>
          <group position={[0, 0, 1.05]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.46, 0.46, 0.32, 32]} />
              <primitive object={screenMaterial} attach="material" />
            </mesh>
            <mesh scale={outlineScale} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.46, 0.46, 0.32, 32]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>

            <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.43, 0.43, 0.02, 32]} />
              <primitive object={buttonBaseMaterial} attach="material" />
            </mesh>

            <mesh position={[0.15, -0.12, -0.09]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.08, 0.015, 6, 12, Math.PI]} />
              <meshBasicMaterial color="#e05353" />
            </mesh>
            <mesh position={[0.08, -0.05, -0.09]} rotation={[0, 0, -Math.PI / 4]}>
              <torusGeometry args={[0.1, 0.015, 6, 12, Math.PI]} />
              <meshBasicMaterial color="#3da5e0" />
            </mesh>

            <group ref={chipRef} position={[0, 0, -0.06]}>
              <mesh>
                <boxGeometry args={[0.26, 0.26, 0.06]} />
                <primitive object={screenMaterial} attach="material" />
              </mesh>
              <mesh scale={outlineScale}>
                <boxGeometry args={[0.26, 0.26, 0.06]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[0.13, 0.13, 0.04]} />
                <primitive object={chipGlowMaterial} attach="material" />
              </mesh>
            </group>
          </group>

          {/* Panel Hinge Door */}
          <group ref={hingeRef} position={[-0.45, 0, 1.205]}>
            <group
              position={[0.45, 0, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
                setIsPanelOpen(!isPanelOpen);
              }}
            >
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.45, 0.45, 0.03, 32]} />
                <primitive object={toonMaterial} attach="material" />
              </mesh>
              <mesh scale={[outlineScale[0], 1.0, outlineScale[2]]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.45, 0.45, 0.03, 32]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
              <mesh position={[0.28, 0, 0.02]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.045, 0.012, 8, 12]} />
                <primitive object={buttonBaseMaterial} attach="material" />
              </mesh>
            </group>
          </group>
        </group>

        {/* LED Base Ring */}
        <group ref={ledGroupRef} position={[0, -0.96, 0]}>
          {ledMode === 'wave' ? (
            <group ref={ledRingRef}>
              {Array.from({ length: 4 }).map((_, i) => {
                const angle = (i * Math.PI) / 2;
                const opacityFactor = 0.15 + (i / 3) * 0.85;
                return (
                  <mesh key={i} rotation={[Math.PI / 2, 0, angle]}>
                    <torusGeometry args={[0.70, 0.042, 8, 16, Math.PI / 2]} />
                    <meshBasicMaterial color={ledThreeColor} transparent opacity={opacityFactor} toneMapped={false} />
                  </mesh>
                );
              })}
            </group>
          ) : (
            <mesh ref={ledRingRef} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.70, 0.042, 8, 48]} />
              <meshBasicMaterial color={ledThreeColor} transparent opacity={ledMode === 'off' ? 0.05 : 1.0} toneMapped={false} />
            </mesh>
          )}
          
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.69, 32]} />
            <primitive object={screenMaterial} attach="material" />
          </mesh>
          <mesh scale={[outlineScale[0], outlineScale[2], 1]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}>
            <circleGeometry args={[0.69, 32]} />
            <primitive object={outlineMaterial} attach="material" />
          </mesh>

          {ledMode !== 'off' && (
            <pointLight ref={ledLightRef} position={[0, -0.05, 0]} intensity={1.8} distance={2.5} color={ledThreeColor} decay={1.2} />
          )}
        </group>

        {/* -------------------------------------------------------------
            NEW DETAILED TECHNICAL INNER REVEAL (NESTED TELESCOPIC CORES)
            Gears & Lenses rise up as explodedProgress increases.
            Solid Toon materials are used to match the Ghibli/Doraemon color theme.
        ------------------------------------------------------------- */}
        {explodedProgress > 0.05 && (
          <group>
            {/* A. WAKE-WORD ENGINE (Small Gear - Sits lower, rises slightly) */}
            <group ref={gearSmallRef} position={[0, explodedProgress * 0.8, 0]}>
              <mesh>
                <cylinderGeometry args={[0.5, 0.5, 0.08, 20]} />
                <primitive object={gearMaterialSmall} attach="material" />
              </mesh>
              <mesh scale={outlineScale}>
                <cylinderGeometry args={[0.5, 0.5, 0.08, 20]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
              {/* Teeth */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 12;
                return (
                  <group key={i} rotation={[0, angle, 0]} position={[Math.cos(angle) * 0.53, 0, Math.sin(angle) * 0.53]}>
                    <mesh>
                      <boxGeometry args={[0.06, 0.06, 0.06]} />
                      <primitive object={gearMaterialSmall} attach="material" />
                    </mesh>
                    <mesh scale={outlineScale}>
                      <boxGeometry args={[0.06, 0.06, 0.06]} />
                      <primitive object={outlineMaterial} attach="material" />
                    </mesh>
                  </group>
                );
              })}
            </group>

            {/* B. NLP PROCESSING MATRIX (Large Gear - Sits middle, rises moderately) */}
            <group ref={gearLargeRef} position={[0, explodedProgress * 1.5, 0]}>
              <mesh>
                <cylinderGeometry args={[0.75, 0.75, 0.1, 24]} />
                <primitive object={gearMaterialLarge} attach="material" />
              </mesh>
              <mesh scale={outlineScale}>
                <cylinderGeometry args={[0.75, 0.75, 0.1, 24]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
              {/* Teeth */}
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 16;
                return (
                  <group key={i} rotation={[0, angle, 0]} position={[Math.cos(angle) * 0.78, 0, Math.sin(angle) * 0.78]}>
                    <mesh>
                      <boxGeometry args={[0.08, 0.08, 0.08]} />
                      <primitive object={gearMaterialLarge} attach="material" />
                    </mesh>
                    <mesh scale={outlineScale}>
                      <boxGeometry args={[0.08, 0.08, 0.08]} />
                      <primitive object={outlineMaterial} attach="material" />
                    </mesh>
                  </group>
                );
              })}
            </group>

            {/* C. ACOUSTIC PERCEPTION LENS (Glass optics + Toon metal housing, rises highest) */}
            <group ref={lensRef} position={[0, explodedProgress * 2.3, 0]}>
              {/* Outer housing */}
              <mesh>
                <torusGeometry args={[0.75, 0.06, 8, 32]} />
                <primitive object={lensRingMaterial} attach="material" />
              </mesh>
              <mesh scale={outlineScale}>
                <torusGeometry args={[0.75, 0.06, 8, 32]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>

              {/* Blue glass lens elements (Keep glass for optics as requested) */}
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.68, 0.68, 0.03, 24]} />
                <meshPhysicalMaterial
                  color="#00f3ff"
                  transmission={1.0}
                  roughness={0.05}
                  thickness={0.15}
                  transparent
                  opacity={0.7}
                />
              </mesh>

              {/* Glowing cyan active ring */}
              <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.7, 0.01, 8, 32]} />
                <meshBasicMaterial color="#00f3ff" toneMapped={false} />
              </mesh>

              {/* Animated 6-blade Aperture Iris */}
              <group ref={bladesRef} position={[0, -0.06, 0]}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const baseAngle = (i * Math.PI * 2) / 6;
                  const radiusOffset = 0.35;
                  const x = Math.cos(baseAngle) * radiusOffset;
                  const z = Math.sin(baseAngle) * radiusOffset;
                  return (
                    <group key={i} position={[x, 0, z]} rotation={[0, baseAngle, 0]}>
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <coneGeometry args={[0.18, 0.26, 3]} />
                        <meshBasicMaterial color={isWhiteTheme ? '#3a3834' : '#1e1c1a'} side={THREE.DoubleSide} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            </group>
          </group>
        )}
      </group>
    </group>
  );
}
