import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FinalAlexaModelProps {
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
  dismantleMode?: boolean;
  cpuScrollProgress?: number;
  debugMode?: boolean;
  alexaOpacityOverride?: number;
}

export function FinalAlexaModel({
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
  dismantleMode = false,
  cpuScrollProgress = 0,
  debugMode = false,
  alexaOpacityOverride,
}: FinalAlexaModelProps) {
  const robotGroupRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Group>(null);
  const ledGroupRef = useRef<THREE.Group>(null);
  const ledRingRef = useRef<any>(null);
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

  useEffect(() => {
    if (explodedProgress > 0) {
      setShowDizzyCooldown(true);
      showDizzyCooldownRef.current = true;
    } else if (explodedProgress === 0 && showDizzyCooldownRef.current) {
      // Dizzy face persists for 2.0 seconds after fully reassembled
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
        // Squash and stretch scale calculation (inspired by Las Vegas Sphere waking up in reverse)
        const cycleTime = t % 5.0; // 5-second loop
        let scaleY = 1.0;
        let scaleX = 1.0;
        let scaleZ = 1.0;
        let hoverHeight = 0;

        if (cycleTime < 1.0) {
          // Phase 1: Awake & getting drowsy (0.0s to 1.0s)
          const progress = cycleTime / 1.0;
          scaleY = 1.0;
          scaleX = 1.0;
          scaleZ = 1.0;
          hoverHeight = -progress * 0.04;
        } else if (cycleTime < 1.4) {
          // Phase 2: Inhale Squash (1.0s to 1.4s)
          const progress = (cycleTime - 1.0) / 0.4;
          const ease = Math.sin((progress * Math.PI) / 2);
          scaleY = 1.0 - ease * 0.12; // down to 0.88
          scaleX = 1.0 + ease * 0.08; // up to 1.08
          scaleZ = 1.0 + ease * 0.08;
          hoverHeight = -0.04 - ease * 0.06; // dips down to -0.10
        } else if (cycleTime < 2.0) {
          // Phase 3: Yawn Stretch Peak (1.4s to 2.0s)
          const progress = (cycleTime - 1.4) / 0.6;
          const ease = Math.sin((progress * Math.PI) / 2);
          const shake = Math.sin(t * 50) * 0.012; // tremor
          scaleY = 0.88 + ease * 0.44 + shake; // stretches to 1.32
          scaleX = 1.08 - ease * 0.26 - shake * 0.5; // shrinks to 0.82
          scaleZ = 1.08 - ease * 0.26 - shake * 0.5;
          hoverHeight = -0.10 + ease * 0.20; // rises up
        } else if (cycleTime < 2.8) {
          // Phase 4: Release & Fall into Sleep (2.0s to 2.8s)
          const progress = (cycleTime - 2.0) / 0.8;
          if (progress < 0.4) {
            // Snap down overshoot
            const p = progress / 0.4;
            scaleY = 1.32 - p * 0.44; // dips to 0.88
            scaleX = 0.82 + p * 0.28; // goes to 1.10
            scaleZ = 0.82 + p * 0.28;
            hoverHeight = 0.10 - p * 0.20; // down to -0.10
          } else {
            // Settle into sleepy breathing base
            const p = (progress - 0.4) / 0.6;
            scaleY = 0.88 + p * 0.08; // rises to 0.96
            scaleX = 1.10 - p * 0.06; // goes to 1.04
            scaleZ = 1.10 - p * 0.06;
            hoverHeight = -0.10 + p * 0.02; // settles at -0.08
          }
        } else {
          // Phase 5: Deep Sleep Breathing (2.8s to 5.0s)
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

        // Toggle visibility of yawning eye components
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
      // In exploded view, reset transformations for clarity
      robotGroupRef.current.position.set(0, 1.1, 0);
      robotGroupRef.current.rotation.set(0, 0, 0);
      robotGroupRef.current.scale.set(1, 1, 1);
    }

    // Antenna wiggle: organic wiggle matching the body sway/hover
    if (antennaRef.current) {
      const wiggleSpeed = isSinging ? 10.0 : (isHovered ? 12 : 4);
      const wiggleAmp = isSinging ? 0.22 : (isHovered ? 0.25 : 0.08);
      antennaRef.current.rotation.z = Math.sin(t * wiggleSpeed) * wiggleAmp;
      antennaRef.current.rotation.x = Math.cos(t * wiggleSpeed * 0.7) * wiggleAmp * 0.5;
    }

    // LED base light ring animations based on mode
    if (ledRingRef.current) {
      if (ledMode === 'off') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        if (ledMaterial) ledMaterial.opacity = 0.05;
        if (ledLightRef.current) ledLightRef.current.intensity = 0;
        ledRingRef.current.rotation.y = 0;
      } else if (ledMode === 'solid') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        if (ledMaterial) ledMaterial.opacity = 1.0;
        if (ledLightRef.current) ledLightRef.current.intensity = 2.0;
        ledRingRef.current.rotation.y = 0;
      } else if (ledMode === 'pulse') {
        const ledMaterial = ledRingRef.current.material as THREE.MeshBasicMaterial;
        const pulse = 0.5 + Math.sin(t * 3.5) * 0.5;
        if (ledMaterial) ledMaterial.opacity = 0.3 + pulse * 0.7;
        if (ledLightRef.current) ledLightRef.current.intensity = 0.4 + pulse * 1.6;
        ledRingRef.current.rotation.y = 0;
      } else if (ledMode === 'wave') {
        // Rotating chase pattern (group)
        ledRingRef.current.rotation.y = -t * 5.0; // spin speed
        if (ledLightRef.current) {
          // constant bright pulse for the light source
          ledLightRef.current.intensity = 1.8;
        }
      }
    }

    // Smooth door hinging open/close
    if (hingeRef.current) {
      const targetHingeRot = isPanelOpen ? -Math.PI * 0.65 : 0;
      hingeRef.current.rotation.y = THREE.MathUtils.lerp(hingeRef.current.rotation.y, targetHingeRot, 0.12);
    }

    // Smooth chip pop-up animation
    if (chipRef.current) {
      const targetChipZ = isPanelOpen ? 0.09 : -0.06;
      chipRef.current.position.z = THREE.MathUtils.lerp(chipRef.current.position.z, targetChipZ, 0.1);
    }

    // Dynamic expression switcher during singing to show passion and effort
    if (isSinging) {
      if (isBlinking) setIsBlinking(false);

      // Slower expression changes (every 2.2 seconds) to mimic singing phrasing bars
      if (t - lastSingingChangeRef.current > 2.2) {
        lastSingingChangeRef.current = t;

        const eyeRandom = Math.random();
        let nextEye = 'happy';

        if (eyeRandom < 0.33) {
          nextEye = 'sleepy'; // Both closed (effort / holding note)
        } else if (eyeRandom < 0.66) {
          nextEye = 'curious'; // Both wide open curious rings
        } else {
          nextEye = 'happy'; // Both open happy arches
        }

        // Switch mouth between happy (wide open) and curious (vowel circle)
        const nextMouth = Math.random() < 0.5 ? 'happy' : 'curious';

        setSingingState({
          leftEye: nextEye,
          rightEye: nextEye,
          mouth: nextMouth,
        });
      }
    }

    // Idle Random Blinking (Blink closed together for 120ms every 2 to 6 seconds)
    if (!isSinging && explodedProgress === 0) {
      if (t > nextBlinkTimeRef.current) {
        setIsBlinking(true);
        blinkEndRef.current = t + 0.12; // blink duration
        nextBlinkTimeRef.current = t + 2.0 + Math.random() * 4.0; // delay until next blink
      }
      if (isBlinking && t > blinkEndRef.current) {
        setIsBlinking(false);
      }
    }

    // Smooth speaking/singing mimic animation
    if (mouthRef.current) {
      if (isSinging) {
        // Singing mouth wiggle: medium-tempo vowels (7.5 rad/s)
        const talkY = 0.6 + Math.sin(t * 7.5) * 0.4;
        const talkX = 1.0 + Math.cos(t * 5.5) * 0.12;
        const mouthTilt = Math.sin(t * 2.8) * 0.06;
        mouthRef.current.scale.set(talkX, talkY, 1);
        mouthRef.current.rotation.z = mouthTilt;
      } else if (isSpeaking) {
        // Talking mouth wiggle: slowed down to a friendly human talking cadence (8.5 rad/s)
        const talkY = 0.5 + Math.abs(Math.sin(t * 8.5)) * 0.6;
        const talkX = 1.0 + Math.sin(t * 6.5) * 0.1;
        mouthRef.current.scale.set(talkX, talkY, 1);
        mouthRef.current.rotation.z = 0;
      } else if (expression === 'sleepy') {
        // Sleepy yawning mouth animation (previous yawn)
        const cycleTime = t % 3.0; // 3-second cycle
        let scaleY = 1.0;
        let scaleX = 1.0;

        if (cycleTime < 0.8) {
          // Phase 1: Opening (0s to 0.8s) - scale from 0.5 to 2.5 on Y, 0.5 to 1.8 on X
          const progress = cycleTime / 0.8;
          scaleY = 0.5 + progress * 2.0;
          scaleX = 0.5 + progress * 1.3;
        } else if (cycleTime < 2.0) {
          // Phase 2: Open / Yawn shake (0.8s to 2.0s) - big size with a tiny wiggle
          scaleY = 2.5 + Math.sin(t * 30) * 0.08;
          scaleX = 1.8 + Math.cos(t * 25) * 0.05;
        } else {
          // Phase 3: Closing (2.0s to 3.0s) - scale back down to 0.5
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
      const cycleTime = t % 5.0; // 5-second cycle
      let scaleY = 1.0;
      let scaleX = 1.0;
      let showClosed = true;

      if (cycleTime < 0.4) {
        // Phase 1: Normal closed/resting mouth
        scaleY = 1.0;
        scaleX = 1.0;
        showClosed = true;
      } else if (cycleTime < 1.0) {
        // Phase 2: Opening wide
        const progress = (cycleTime - 0.4) / 0.6;
        scaleY = 0.3 + progress * 2.7; // opens to 3.0
        scaleX = 0.3 + progress * 1.7; // opens to 2.0
        showClosed = false;
      } else if (cycleTime < 2.1) {
        // Phase 3: Peak open with tension wiggle
        scaleY = 3.0 + Math.sin(t * 30) * 0.08;
        scaleX = 2.0 + Math.cos(t * 25) * 0.05;
        showClosed = false;
      } else if (cycleTime < 2.8) {
        // Phase 4: Closing
        const progress = (cycleTime - 2.1) / 0.7;
        scaleY = 3.0 - progress * 2.7; // down to 0.3
        scaleX = 2.0 - progress * 1.7; // down to 0.3
        showClosed = progress > 0.8; // show closed once mostly closed
      } else {
        // Phase 5: Deep sleep breathing mouth
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
      // Dizzy state: center the eyes (no floating or horizontal flat-plane sliding) and spin the crosses
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

      // Dizzy head shake/wobble recovery animation (only when fully reassembled)
      if (showDizzyCooldown && explodedProgress === 0 && robotGroupRef.current) {
        robotGroupRef.current.rotation.z = Math.sin(t * 16.0) * 0.08;
        robotGroupRef.current.rotation.x = Math.cos(t * 13.0) * 0.05;
        robotGroupRef.current.rotation.y = Math.sin(t * 9.0) * 0.05;
      } else if (robotGroupRef.current) {
        robotGroupRef.current.rotation.set(0, 0, 0);
      }
    } else {
      // Normal cursor tracking (clamped pupil shift inside sockets)
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
  });

  // Resolve active expressions, overriding defaults if blinking or singing is active
  const [leftEyeToShow, rightEyeToShow] = useMemo(() => {
    if (explodedProgress > 0 || showDizzyCooldown) {
      return ['dizzy', 'dizzy'];
    }
    if (isBlinking) {
      return ['sleepy', 'sleepy']; // Blink closed together
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
    if (dismantleMode) {
      return 'excited';
    }
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

  // ── Dismantle Sequence color & opacity timeline calculations ─────────────
  const s = cpuScrollProgress;
  let alexaOpacity = 1.0;
  let currentBodyColor = bodyColor;
  let currentBottomColor = bodyColor;
  let currentLedColor = ledColor;

  if (dismantleMode) {
    // 1. Opacity calculation (Alexa remains solid cream, then vanishes completely at s = 0.20)
    if (s < 0.20) {
      alexaOpacity = 1.0; // Opaque shell
    } else if (s < 0.25) {
      // Rapid Thanos fade-away
      const tFade = (s - 0.20) / 0.05;
      alexaOpacity = THREE.MathUtils.lerp(1.0, 0.0, tFade);
    } else {
      alexaOpacity = 0.0; // Stay invisible for the rest of the scroll timeline
    }

    // Apply manual opacity override if provided
    if (alexaOpacityOverride !== undefined) {
      alexaOpacity = alexaOpacityOverride;
    }

    // 2. Color calculation
    const baseColor = new THREE.Color(bodyColor);
    const blackColor = new THREE.Color('#161514');
    const baseLedColor = new THREE.Color(ledColor);
    const targetLedColor = new THREE.Color('#ff3333'); // Red LED

    if (debugMode) {
      currentBodyColor = bodyColor;
      currentBottomColor = bodyColor;
      currentLedColor = baseLedColor.getStyle();
    } else {
      if (s < 0.20) {
        const t = s / 0.20;
        const lerpedBody = new THREE.Color().lerpColors(baseColor, blackColor, t);
        currentBodyColor = lerpedBody.getStyle();
        currentBottomColor = lerpedBody.getStyle();
        currentLedColor = new THREE.Color().lerpColors(baseLedColor, targetLedColor, t).getStyle();
      } else if (s < 0.80) {
        currentBodyColor = blackColor.getStyle();
        currentBottomColor = blackColor.getStyle();
        currentLedColor = targetLedColor.getStyle();
      } else {
        const t = Math.min(1, (s - 0.80) / 0.20);
        const lerpedBody = new THREE.Color().lerpColors(blackColor, baseColor, t);
        currentBodyColor = lerpedBody.getStyle();
        currentBottomColor = lerpedBody.getStyle();
        currentLedColor = new THREE.Color().lerpColors(targetLedColor, baseLedColor, t).getStyle();
      }
    }
  }

  // Colors parsed to THREE formats
  const mainColor = useMemo(() => new THREE.Color(currentBodyColor), [currentBodyColor]);
  const bottomColor = useMemo(() => new THREE.Color(currentBottomColor), [currentBottomColor]);
  const outlineColor = useMemo(() => new THREE.Color('#141312'), []);
  const ledThreeColor = useMemo(() => new THREE.Color(currentLedColor), [currentLedColor]);

  // Share materials to optimize rendering
  const toonMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: mainColor,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [mainColor, alexaOpacity, dismantleMode]);

  const doubleSidedToonMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: mainColor,
      side: THREE.DoubleSide,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [mainColor, alexaOpacity, dismantleMode]);

  const bottomToonMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: bottomColor,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [bottomColor, alexaOpacity, dismantleMode]);

  const outlineMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: outlineColor,
      side: THREE.BackSide,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [outlineColor, alexaOpacity, dismantleMode]);

  // Adjust outline thickness scale factor
  const outlineScale = useMemo(() => {
    const scaleFactor = 1.0 + outlineThickness * 0.025;
    return [scaleFactor, scaleFactor, scaleFactor] as [number, number, number];
  }, [outlineThickness]);

  // Dark screen backing material
  const screenMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: '#08080a',
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [alexaOpacity, dismantleMode]);

  // Bright glowing face material (Always white)
  const faceGlowMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      toneMapped: false,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [alexaOpacity, dismantleMode]);

  const buttonBaseMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: '#e6dfd5',
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [alexaOpacity, dismantleMode]);

  // Golden processor chip color
  const chipGlowMaterial = useMemo(() => {
    const isTranslucent = dismantleMode && alexaOpacity < 1.0;
    return new THREE.MeshBasicMaterial({
      color: '#f1c40f',
      toneMapped: false,
      transparent: isTranslucent,
      opacity: alexaOpacity,
      depthWrite: !isTranslucent,
    });
  }, [alexaOpacity, dismantleMode]);


  // Compute positions dynamically based on explodedProgress
  const yHeadGroup = 0; // relative to parent
  const yAntenna = 0; // Fixed to top half
  const yLed = -explodedProgress * 0.8;

  return (
    <group ref={robotGroupRef}>
      {/* 1. MAIN SPHERICAL BODY ASSEMBLY */}
      <group position={[0, yHeadGroup, 0]}>
        {/* Seamless Sliced Sphere Head (rendered only in assembled state) */}
        {explodedProgress === 0 && (
          <>
            <mesh>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, 2.50]} />
              <primitive object={toonMaterial} attach="material" />
            </mesh>
            <mesh scale={outlineScale}>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, 2.50]} />
              <primitive object={outlineMaterial} attach="material" />
            </mesh>
          </>
        )}

        {/* Sliced Sphere Head (Top Half - opens like a lid) */}
        <group position={[0, 0.26 - explodedProgress * 1.0, -1.11 - explodedProgress * 0.35]}> {/* Hinge point pushed further down and back away from the screen */}
          <group rotation={[-explodedProgress * Math.PI * 0.45, 0, 0]}>
            <group position={[0, -0.26, 1.11]}> {/* Offset back to center */}
              {explodedProgress > 0 && (
                <>
                  <mesh>
                    <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={doubleSidedToonMaterial} attach="material" />
                  </mesh>
                  <mesh scale={outlineScale}>
                    <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={outlineMaterial} attach="material" />
                  </mesh>
                </>
              )}

              {/* 3. CUTE RETRO MECHA ANTENNA (Doraemon style) - attached to the lid */}
              <group ref={antennaRef} position={[0, 1.20 + yAntenna, 0]} rotation={[0, 0, 0]}>
                {/* Flat bracket base */}
                <mesh>
                  <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
                  <primitive object={toonMaterial} attach="material" />
                </mesh>
                <mesh scale={outlineScale}>
                  <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>

                {/* Stem rod */}
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                  <primitive object={buttonBaseMaterial} attach="material" />
                </mesh>
                <mesh position={[0, 0.2, 0]} scale={[outlineScale[0] * 1.5, outlineScale[1], outlineScale[2] * 1.5]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>

                {/* Spherical bulb on top */}
                <mesh position={[0, 0.42, 0]}>
                  <sphereGeometry args={[0.075, 16, 16]} />
                  <meshBasicMaterial
                    color="#3da5e0"
                    transparent={dismantleMode && alexaOpacity < 1.0}
                    opacity={alexaOpacity}
                    depthWrite={!(dismantleMode && alexaOpacity < 1.0)}
                  />
                </mesh>
                <mesh position={[0, 0.42, 0]} scale={outlineScale}>
                  <sphereGeometry args={[0.075, 16, 16]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>
              </group>

              {/* 2. GLOWING FACIAL EXPRESSIONS - EYES (attached to the lid) */}
              <group ref={eyesGroupRef}>
                {/* LEFT EYE */}
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
                      {/* Awake phase shape */}
                      <group ref={leftYawnAwakeRef} position={[-0.24, 0.12, 1.22]} rotation={[0, -0.2, 0]}>
                        <mesh>
                          <ringGeometry args={[0.05, 0.09, 24]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                      {/* Slit/Closed phase shape */}
                      <group ref={leftYawnClosedRef} position={[-0.24, 0.10, 1.22]} rotation={[0, -0.2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.20, 0.022, 0.01]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                    </group>
                  )}
                </group>

                {/* RIGHT EYE */}
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
                      {/* Awake phase shape */}
                      <group ref={rightYawnAwakeRef} position={[0.24, 0.12, 1.22]} rotation={[0, 0.2, 0]}>
                        <mesh>
                          <ringGeometry args={[0.05, 0.09, 24]} />
                          <primitive object={faceGlowMaterial} attach="material" />
                        </mesh>
                      </group>
                      {/* Slit/Closed phase shape */}
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

        {/* Sliced Sphere Head (Bottom Half - slides down) */}
        <group position={[0, -explodedProgress * 0.8, 0]}>
          {explodedProgress > 0 && (
            <>
              <mesh>
                <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, 2.50 - Math.PI / 2]} />
                <primitive object={bottomToonMaterial} attach="material" />
              </mesh>
              <mesh scale={outlineScale}>
                <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, 2.50 - Math.PI / 2]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
              {/* Flat Cap at the top of bottom hemisphere (visible when split) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[1.2, 32]} />
                <primitive object={bottomToonMaterial} attach="material" />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[outlineScale[0], outlineScale[1], 1]}>
                <circleGeometry args={[1.2, 32]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>
            </>
          )}

          {/* MOUTH (slides down with the bottom hemisphere) */}
          <group ref={mouthRef}>
            {mouthToShow === 'happy' && (
              <group position={[0, -0.16, 1.225]} rotation={[0.13, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false}>
                  <circleGeometry args={[0.16, 32, Math.PI, Math.PI]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'curious' && (
              <group position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false}>
                  <ringGeometry args={[0.03, 0.07, 24]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'wink' && (
              <group position={[0, -0.16, 1.225]} rotation={[0.13, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false}>
                  <circleGeometry args={[0.16, 32, Math.PI, Math.PI]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'sleepy' && (
              <group ref={mouthRef} position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false}>
                  <ringGeometry args={[0.02, 0.07, 32]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'dizzy' && (
              <group position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false} rotation={[0, 0, Math.PI / 4]}>
                  <ringGeometry args={[0.03, 0.07, 4]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'excited' && (
              <group position={[0, -0.12, 1.225]} rotation={[0.1, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false}>
                  <circleGeometry args={[0.22, 32, Math.PI, Math.PI]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'sad' && (
              <group position={[0, -0.15, 1.225]} rotation={[0.12, 0, 0]}>
                <mesh castShadow={false} receiveShadow={false} rotation={[0, 0, 0]}>
                  <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
                  <primitive object={faceGlowMaterial} attach="material" />
                </mesh>
              </group>
            )}

            {mouthToShow === 'yawning' && (
              <group ref={yawnMouthRef} position={[0, -0.18, 1.225]} rotation={[0.15, 0, 0]}>
                {/* Yawn open geometry */}
                <group ref={yawnMouthOpenRef}>
                  <mesh castShadow={false} receiveShadow={false}>
                    <ringGeometry args={[0.01, 0.07, 32]} />
                    <primitive object={faceGlowMaterial} attach="material" />
                  </mesh>
                </group>
                {/* Yawn closed / sleeping geometry */}
                <group ref={yawnMouthClosedRef}>
                  <mesh castShadow={false} receiveShadow={false}>
                    <ringGeometry args={[0.02, 0.045, 16]} />
                    <primitive object={faceGlowMaterial} attach="material" />
                  </mesh>
                </group>
              </group>
            )}
          </group>

          {/* 4. SIDE/BACK ELECTRICAL HATCH (180 degrees behind face) */}
          <group rotation={[0, Math.PI, 0]}>
            {/* Circular Cavity Housing */}
            <group position={[0, 0, 1.05]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.46, 0.46, 0.32, 32]} />
                <primitive object={screenMaterial} attach="material" />
              </mesh>
              <mesh scale={outlineScale} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.46, 0.46, 0.32, 32]} />
                <primitive object={outlineMaterial} attach="material" />
              </mesh>

              {/* Circular green Motherboard PCB */}
              <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.43, 0.43, 0.02, 32]} />
                <primitive object={buttonBaseMaterial} attach="material" />
              </mesh>

              {/* Wires */}
              <mesh position={[0.15, -0.12, -0.09]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.08, 0.015, 6, 12, Math.PI]} />
                <meshBasicMaterial 
                  color="#e05353" 
                  transparent={dismantleMode && alexaOpacity < 1.0}
                  opacity={alexaOpacity}
                  depthWrite={!(dismantleMode && alexaOpacity < 1.0)}
                />
              </mesh>
              <mesh position={[0.08, -0.05, -0.09]} rotation={[0, 0, -Math.PI / 4]}>
                <torusGeometry args={[0.1, 0.015, 6, 12, Math.PI]} />
                <meshBasicMaterial 
                  color="#3da5e0" 
                  transparent={dismantleMode && alexaOpacity < 1.0}
                  opacity={alexaOpacity}
                  depthWrite={!(dismantleMode && alexaOpacity < 1.0)}
                />
              </mesh>

              {/* 3D POP-UP PROCESSOR CHIP */}
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

                {[
                  [-0.08, -0.08],
                  [-0.08, 0.08],
                  [0.08, -0.08],
                  [0.08, 0.08],
                ].map(([x, y], i) => (
                  <mesh key={i} position={[x, y, 0.01]}>
                    <boxGeometry args={[0.03, 0.03, 0.045]} />
                    <primitive object={chipGlowMaterial} attach="material" />
                  </mesh>
                ))}
              </group>
            </group>

            {/* Door Hinge */}
            <group ref={hingeRef} position={[-0.45, 0, 1.205]}>
              <group
                position={[0.45, 0, 0]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'default';
                }}
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
                <mesh position={[0.28, 0, 0.02]} scale={outlineScale} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.045, 0.012, 8, 12]} />
                  <primitive object={outlineMaterial} attach="material" />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* 5. GLOWING BASE LIGHT RING (At the flat sliced bottom, Y = -0.96) */}
      <group ref={ledGroupRef} position={[0, -0.96 + yLed, 0]} visible={alexaOpacity > 0}>
        {/* Glow Ring Torus segments for Wave Mode vs Normal */}
        {ledMode === 'wave' ? (
          <group rotation={[-Math.PI, 0, 0]}>
            <group ref={ledRingRef}>
              {Array.from({ length: 4 }).map((_, i) => {
                const angle = (i * Math.PI) / 2;
                const opacityFactor = 0.15 + (i / 3) * 0.85; // smooth trailing gradient: 0.15, 0.43, 0.71, 1.0
                return (
                  <mesh key={i} rotation={[Math.PI / 2, 0, angle]}>
                    <torusGeometry args={[0.70, 0.042, 8, 16, Math.PI / 2]} />
                    <meshBasicMaterial
                      color={ledThreeColor}
                      transparent
                      opacity={opacityFactor * alexaOpacity}
                      toneMapped={false}
                    />
                  </mesh>
                );
              })}
            </group>
          </group>
        ) : (
          <mesh ref={ledRingRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.70, 0.042, 8, 48]} />
            <meshBasicMaterial
              color={ledThreeColor}
              transparent
              opacity={(ledMode === 'off' ? 0.05 : 1.0) * alexaOpacity}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Flat Bottom Bezel Cover */}
        <mesh rotation={[Math.PI / 2, 0, 0]} visible={alexaOpacity > 0.1}>
          <circleGeometry args={[0.69, 32]} />
          <primitive object={screenMaterial} attach="material" />
        </mesh>
        {/* Outline for the base foot */}
        <mesh scale={[outlineScale[0], outlineScale[2], 1]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}>
          <circleGeometry args={[0.69, 32]} />
          <primitive object={outlineMaterial} attach="material" />
        </mesh>

        {/* Real Light projection onto the pedestal floor (pulses with mode) */}
        {ledMode !== 'off' && (
          <pointLight
            ref={ledLightRef}
            position={[0, -0.05, 0]}
            intensity={1.8 * alexaOpacity}
            distance={2.5}
            color={ledThreeColor}
            decay={1.2}
          />
        )}
      </group>
    </group>
  );
}

