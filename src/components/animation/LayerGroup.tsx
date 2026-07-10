import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshTransmissionMaterial, Edges, Html } from '@react-three/drei';



interface LayerGroupProps {
  index: number;
  ledColor: string;
  scrollProgress: number; // Prop passed from parent to calculate tracing progress
}

export function LayerGroup({ index, ledColor, scrollProgress }: LayerGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const instancedNodesRef = useRef<THREE.InstancedMesh>(null);
  const connectionLinesRef = useRef<THREE.LineSegments>(null);

  // Layer 2 gear drop-in-and-snap refs
  const gearGroupRef = useRef<THREE.Group>(null);
  const gearLabelDivRef = useRef<HTMLDivElement>(null);
  const gearLabelSpanRef = useRef<HTMLSpanElement>(null);
  const idleGearRef = useRef<THREE.Group>(null);

  // Position damping variables
  const currentX = useRef(0);
  const currentY = useRef(0);

  // Clamps and Pins refs for Layer 0 mechanical animations
  const clampLeftRef = useRef<THREE.Mesh>(null);
  const clampRightRef = useRef<THREE.Mesh>(null);
  const pinsGroupRef = useRef<THREE.Group>(null);

  // Layer 0 gauge + cutoff actuator refs
  const gaugeNeedleRef = useRef<THREE.Group>(null);
  const latchArmRef = useRef<THREE.Group>(null);
  const sparkRef = useRef<THREE.Mesh>(null);

  // Data packets refs for Layer 1 silicon trace crawling
  const packetRef1 = useRef<THREE.Mesh>(null);
  const packetRef2 = useRef<THREE.Mesh>(null);
  const packetRef3 = useRef<THREE.Mesh>(null);

  // Layer 1 water-ripple refs
  const ripple1Ref = useRef<THREE.Mesh>(null);
  const ripple2Ref = useRef<THREE.Mesh>(null);




  const agentRef1 = useRef<THREE.Group>(null);
  const agentRef2 = useRef<THREE.Group>(null);
  const agentRef3 = useRef<THREE.Group>(null);

  // New gears, sliding capacitors refs
  const gearLeftRef = useRef<THREE.Group>(null);
  const gearRightRef = useRef<THREE.Group>(null);
  const cap1Ref = useRef<THREE.Group>(null);
  const cap2Ref = useRef<THREE.Group>(null);
  const supervisorHeadRef = useRef<THREE.Group>(null);

  // Layer 5 rule-forge ref
  const ruleDiscRef = useRef<THREE.Mesh>(null);

  // Layer 4 constellation-twinkle refs
  const flashLineRef = useRef<THREE.LineSegments>(null);
  const edgePairsRef = useRef<[THREE.Vector3, THREE.Vector3][]>([]);

  // Layer 3 terminal-ticker refs
  const tickerTextRef = useRef<HTMLSpanElement>(null);
  const tickerCursorRef = useRef<HTMLSpanElement>(null);



  // Compute trace progression factor (0.0 to 1.0) starting at scroll 0.70, peaking at 0.73, plateauing until 0.82, and returning to 0 at 0.85
  const traceProgress = useMemo(() => {
    if (scrollProgress < 0.70) return 0;
    if (scrollProgress < 0.73) {
      return (scrollProgress - 0.70) / 0.03;
    }
    if (scrollProgress < 0.82) {
      return 1.0;
    }
    if (scrollProgress < 0.85) {
      return 1.0 - (scrollProgress - 0.82) / 0.03;
    }
    return 0;
  }, [scrollProgress]);

  const emergence = scrollProgress < 0.20 ? 0 : (scrollProgress < 0.40 ? (scrollProgress - 0.20) / 0.20 : 1.0);
  const oledOpacity = scrollProgress < 0.20 || scrollProgress >= 0.40
    ? 0
    : (scrollProgress < 0.25 ? (scrollProgress - 0.20) / 0.05 : (scrollProgress < 0.35 ? 1.0 : 1.0 - (scrollProgress - 0.35) / 0.05));

  const details = useMemo(() => [
    {
      title: "FAIL-SAFE CONTROL BASE (T0)",
      desc: "Always-on physical hardware base. Runs actuator-local fail-safe timer safety cutoffs."
    },
    {
      title: "ACOUSTIC EMBEDDINGS (T1)",
      desc: "Always-on edge NPU. Emits audio embeddings for zero-shot sound discovery."
    },
    {
      title: "MCP SERVICE INTERPOSER",
      desc: "Home hub server aggregating device sensors and actuators as local MCP schemas."
    },
    {
      title: "EDGE SLM & RULE ENGINE (T2 & T0)",
      desc: "T0 deterministic triggers and resident Edge SLM routing routines locally."
    },
    {
      title: "ONTOLOGY ADAPTER SHIELD",
      desc: "Ontology schema mappings, dynamic driver adapters, and policy authorization filters."
    },
    {
      title: "BEDROCK MULTI-AGENT (T3)",
      desc: "Supervisor agent plans, delegates to at most two specialists — Commerce, Home-control, Safety/Policy, Knowledge/Tutor. Never a swarm."
    }
  ], []);

  const currentDetails = details[index];

  // Interpolated colors for wireframe transitions
  const activeColor = useMemo(() => {
    const c1 = new THREE.Color(ledColor);
    const c2 = new THREE.Color('#4a4137');
    return c1.lerp(c2, traceProgress).getStyle();
  }, [ledColor, traceProgress]);

  // Reusable scratch color for Layer 4's per-instance twinkle (avoids
  // allocating a new THREE.Color every node, every frame).
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Generate random movement seeds for the 16 floating data nodes on the top plate
  const nodeSeeds = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const row = i % 4;
      const col = Math.floor(i / 4);
      const baseX = (row - 1.5) * 0.9;
      const baseZ = (col - 1.5) * 0.9;

      return {
        baseX,
        baseZ,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        speedX: 0.6 + Math.random() * 0.8,
        speedY: 0.8 + Math.random() * 1.0,
        speedZ: 0.6 + Math.random() * 0.8,
        amplitude: 0.15 + Math.random() * 0.2,
      };
    });
  }, []);

  // Shared material for Layer 2's drop-in gear (hub + 8 teeth all reference
  // this one object so a single per-frame opacity write reveals the whole
  // gear at once, matching this file's existing shared-material pattern
  // (e.g. materials.socketGold shared across 49 pin meshes).
  const gearMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d9a98a',
    metalness: 0.85,
    roughness: 0.2,
    transparent: true,
    opacity: 0,
  }), []);

  // Sync positions on every frame
  useFrame((state, delta) => {
    const s = scrollProgress;
    const elapsed = state.clock.elapsedTime;
    const gate = THREE.MathUtils.smoothstep(traceProgress, 0, 0.15);
    let targetX = 0;
    let targetY = 0;

    if (s < 0.20) {
      // Phase 1: Rise stacked together (0.0 -> 0.20)
      targetX = 0;
      targetY = 0;
    } else if (s < 0.40) {
      // Phase 2: Separate vertically (0.20 -> 0.40) - separate downwards under base plate
      const t = (s - 0.20) / 0.20;
      targetX = 0;
      targetY = -index * 1.2 * t; 
    } else if (s < 0.85) {
      // Phase 3-6: Horizontal Splay (0.40 -> 0.85)
      // Splay completes at scroll 0.50 and remains splayed.
      const splayT = s < 0.50 ? (s - 0.40) / 0.10 : 1.0;
      const splayX = (index - 2.5) * 6.5;
      
      targetX = THREE.MathUtils.lerp(0, splayX, splayT);
      targetY = THREE.MathUtils.lerp(-index * 1.2, 0, splayT);
    } else {
      // Phase 7: Sequential Joining (0.85 -> 1.00) - stack downwards under base plate
      const splayX = (index - 2.5) * 6.5;
      
      if (index === 0) {
        targetX = 0;
        targetY = 0;
      } else {
        const start = 0.85 + (index - 1) * 0.03;
        const end = start + 0.03;
        
        if (s < start) {
          targetX = splayX;
          targetY = 0;
        } else if (s < end) {
          const t = (s - start) / 0.03;
          const eased = THREE.MathUtils.smoothstep(t, 0, 1);
          targetX = THREE.MathUtils.lerp(splayX, 0, eased);
          targetY = THREE.MathUtils.lerp(0, -index * 0.22, eased);
        } else {
          targetX = 0;
          targetY = -index * 0.22;
        }
      }
    }

    const lambda = s >= 0.85 ? 4.0 : 8;
    currentX.current = THREE.MathUtils.damp(currentX.current, targetX, lambda, delta);
    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, lambda, delta);

    if (groupRef.current) {
      groupRef.current.position.set(currentX.current, currentY.current, 0);
    }

    // Layer 0: clamps/pins stay static; gauge + actuator get idle motion.
    if (index === 0) {
      if (clampLeftRef.current) clampLeftRef.current.position.x = -2.25;
      if (clampRightRef.current) clampRightRef.current.position.x = 2.25;
      if (pinsGroupRef.current) {
        pinsGroupRef.current.children.forEach((child) => {
          child.position.y = -0.05;
        });
      }

      // Pressure gauge needle: continuous sweep, amplitude gated by fade-in.
      if (gaugeNeedleRef.current) {
        const sweep = THREE.MathUtils.degToRad(35);
        gaugeNeedleRef.current.rotation.y = Math.sin(elapsed * 1.4) * sweep * gate;
      }

      // Cutoff actuator: latch snaps down + spark flash every 4s, both
      // derived from elapsed % period so scrubbing never leaves it stuck
      // mid-snap. Rest angle (~20deg) is the latch's idle raised tilt;
      // it swings toward flat (0) sharply, then eases back up.
      const latchPeriod = 4.0;
      const latchCycle = elapsed % latchPeriod;
      const latchRestAngle = 0.35;
      let latchAngle = latchRestAngle;
      let sparkPhase = -1;
      if (latchCycle < 0.15) {
        const t = latchCycle / 0.15;
        latchAngle = latchRestAngle * Math.pow(1 - t, 3);
        sparkPhase = latchCycle / 0.2;
      } else if (latchCycle < 0.45) {
        const t = (latchCycle - 0.15) / 0.3;
        latchAngle = latchRestAngle * (1 - Math.pow(1 - t, 2));
      }
      if (latchArmRef.current) {
        latchArmRef.current.rotation.x = latchAngle * gate;
      }
      if (sparkRef.current) {
        const sparkMat = sparkRef.current.material as THREE.MeshBasicMaterial;
        if (sparkPhase >= 0 && sparkPhase <= 1) {
          const sparkScale = Math.sin(sparkPhase * Math.PI) * 1.4;
          sparkRef.current.scale.set(sparkScale, sparkScale, sparkScale);
          sparkMat.opacity = (1 - sparkPhase) * gate;
        } else {
          sparkMat.opacity = 0;
        }
      }
    }

    if (index === 1) {
      // Packets remain at their static positions (this plan replaced their
      // motion with the ripple below rather than making the packets crawl).
      if (packetRef1.current) packetRef1.current.position.set(-1.5, 0.09, -1.5);
      if (packetRef2.current) packetRef2.current.position.set(1.5, 0.09, -1.5);
      if (packetRef3.current) packetRef3.current.position.set(0, 0.09, 0);

      // Micro-fan actually spins now. Rotation itself is unconditional
      // (harmless while invisible pre-reveal); the fan's own material
      // opacity already fades via `1 - traceProgress` in its existing JSX,
      // so no extra gating is needed here.
      if (fanRef.current) {
        fanRef.current.rotation.y = elapsed * 6;
      }

      // Water ripple: two rings expanding + fading from the silicon die,
      // offset by half a cycle so a second ripple is always mid-expansion
      // when the first fades out. Amplitude/opacity gated by `gate` so it
      // powers on as the layer's trace reveals.
      const rippleCycle = 2.5;
      const r1t = (elapsed % rippleCycle) / rippleCycle;
      const r2t = ((elapsed + rippleCycle / 2) % rippleCycle) / rippleCycle;
      if (ripple1Ref.current) {
        const scale = THREE.MathUtils.lerp(0.3, 1.8, r1t);
        ripple1Ref.current.scale.set(scale, 1, scale);
        const mat = ripple1Ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(0.6, 0, r1t) * gate * (1 - traceProgress);
      }
      if (ripple2Ref.current) {
        const scale = THREE.MathUtils.lerp(0.3, 1.8, r2t);
        ripple2Ref.current.scale.set(scale, 1, scale);
        const mat = ripple2Ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(0.6, 0, r2t) * gate * (1 - traceProgress);
      }

      // Animate sliding capacitors on Layer 1
      const cycleCap = elapsed * 1.5;
      const x1 = Math.sin(cycleCap) * 0.45;
      const x2 = Math.cos(cycleCap * 0.8) * 0.45;
      if (cap1Ref.current) cap1Ref.current.position.x = x1;
      if (cap2Ref.current) cap2Ref.current.position.x = x2;
    }

    if (index === 2) {
      // Cyber rings and orbitals remain static
      if (ringRef.current) ringRef.current.rotation.set(Math.PI / 2, 0, 0);
      if (innerRingRef.current) innerRingRef.current.rotation.set(0, 0, 0);

      // Gear train drop-in-and-snap and combining logic:
      const gearPeriod = 7.0;
      const gcycle = elapsed % gearPeriod;

      // If splayed, gears remain combined and spin continuously
      const isSplayed = s >= 0.4;
      let gearY = 1.2;
      let gearOpacity = 0;
      let gearSpin = 0;
      let meshFactor = 0;
      
      if (isSplayed) {
        gearY = 0.09;
        gearOpacity = 1.0;
        gearSpin = elapsed * 3.0;
        meshFactor = 1.0;
      } else {
        // Loop drop-in-and-snap only when not splayed (during initial phases)
        if (gcycle < 1.0) {
          const t = gcycle / 1.0;
          const eased = 1 - Math.pow(1 - t, 4);
          gearY = THREE.MathUtils.lerp(1.2, 0.09, eased);
          gearOpacity = Math.min(1, t * 3);
          gearSpin = t * Math.PI * 4;
          meshFactor = 0;
        } else if (gcycle < 2.0) {
          const t = (gcycle - 1.0) / 1.0;
          gearY = 0.09;
          gearOpacity = 1;
          gearSpin = Math.PI * 4 + t * Math.PI * 2;
          meshFactor = t;
        } else if (gcycle < 5.0) {
          const t = (gcycle - 2.0) / 3.0;
          gearY = 0.09;
          gearOpacity = 1;
          gearSpin = Math.PI * 6 + t * Math.PI * 12;
          meshFactor = 1;
        } else if (gcycle < 6.0) {
          const t = (gcycle - 5.0) / 1.0;
          gearY = 0.09;
          gearOpacity = 1;
          gearSpin = Math.PI * 18 + t * Math.PI * 2;
          meshFactor = 1 - t;
        } else {
          const t = (gcycle - 6.0) / 1.0;
          const eased = Math.pow(t, 2.2);
          gearY = THREE.MathUtils.lerp(0.09, 1.2, eased);
          gearOpacity = 1 - t;
          gearSpin = Math.PI * 20 + t * Math.PI * 2;
          meshFactor = 0;
        }
      }

      if (gearGroupRef.current) {
        gearGroupRef.current.position.y = gearY;
        gearGroupRef.current.rotation.set(0, gearSpin, 0);
        gearGroupRef.current.scale.set(emergence, emergence, emergence);
      }

      // Slide Left & Right gears in and out
      const baseLeftX = -0.58;
      const baseRightX = 0.58;
      const offsetFactor = (1 - meshFactor) * 0.22;
      if (gearLeftRef.current) {
        gearLeftRef.current.position.x = baseLeftX - offsetFactor;
        gearLeftRef.current.rotation.y = -gearSpin * (12 / 9);
      }
      if (gearRightRef.current) {
        gearRightRef.current.position.x = baseRightX + offsetFactor;
        gearRightRef.current.rotation.y = -gearSpin * (12 / 9);
      }

      // Ensure gears are visible with full color when splayed or trace is active
      gearMaterial.opacity = gearOpacity * (isSplayed ? 1.0 : (1 - traceProgress) * gate);

      // Capability label: what the gear currently represents.
      const capabilityLabels = ['ACT: PLUG_04', 'SENSE: DOOR_02', 'STATE: THERMO_01', 'ACT: LOCK_03'];
      const cycleIndex = Math.floor(elapsed / gearPeriod) % capabilityLabels.length;
      const prefix = gcycle < 5.0 ? '+' : '–';
      if (gearLabelSpanRef.current) {
        gearLabelSpanRef.current.textContent = `${prefix}${capabilityLabels[cycleIndex]}`;
      }
      if (gearLabelDivRef.current) {
        gearLabelDivRef.current.style.opacity = String(gearOpacity * gate);
      }

      // Idle reference gear: small, dim, permanently spinning in a corner.
      if (idleGearRef.current) {
        idleGearRef.current.rotation.y = elapsed * 1.2;
      }
    }

    if (index === 3) {
      // Terminal ticker: hex digits tick, cursor blinks. Written via direct
      // DOM mutation (not setState) to avoid a React re-render every frame,
      // matching how the rest of this file mutates Three.js objects
      // directly inside useFrame.
      const hex = '0123456789ABCDEF';
      const tickSpeed = 6;
      const tickIndex = Math.floor(elapsed * tickSpeed);
      const c1 = hex[tickIndex % 16];
      const c2 = hex[(tickIndex + 7) % 16];
      const cursorOn = Math.floor(elapsed * 2) % 2 === 0;
      if (tickerTextRef.current) {
        tickerTextRef.current.textContent = `0x${c1}${c2}`;
      }
      if (tickerCursorRef.current) {
        tickerCursorRef.current.style.opacity = cursorOn ? '1' : '0';
      }
    }

    if (index === 4 && instancedNodesRef.current) {
      const mesh = instancedNodesRef.current;
      const tempObject = new THREE.Object3D();
      const nodePositions: THREE.Vector3[] = [];
      const baseColor = new THREE.Color(activeColor);

      for (let i = 0; i < 16; i++) {
        const seed = nodeSeeds[i];
        const x = seed.baseX;
        const y = 0.35;
        const z = seed.baseZ;

        nodePositions.push(new THREE.Vector3(x, y, z));
        tempObject.position.set(x, y, z);
        tempObject.scale.set(0.9, 0.9, 0.9);
        tempObject.rotation.set(0, 0, 0);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        // Per-node twinkle: reuses the phase/speed seed data originally
        // generated for drift (never actually used, since this layer's
        // node geometry was never attached to any JSX element until this
        // task). Brightness only — position stays at baseX/baseZ, no float.
        const brightness = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * seed.speedY + seed.phaseY));
        mesh.setColorAt(i, tempColor.copy(baseColor).multiplyScalar(brightness * gate));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.visible = gate > 0;

      // Draw connections (topology recomputed each frame; nodes don't move
      // so in practice the edge list is stable, but this matches the
      // original logic's structure).
      if (connectionLinesRef.current) {
        const linePositions: number[] = [];
        const edgePairs: [THREE.Vector3, THREE.Vector3][] = [];
        for (let i = 0; i < 16; i++) {
          for (let j = i + 1; j < 16; j++) {
            const dist = nodePositions[i].distanceTo(nodePositions[j]);
            if (dist < 1.35) {
              linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
              linePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
              edgePairs.push([nodePositions[i], nodePositions[j]]);
            }
          }
        }
        const geom = connectionLinesRef.current.geometry;
        geom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        geom.attributes.position.needsUpdate = true;
        edgePairsRef.current = edgePairs;
      }

      // Secondary: flash one connection line on a 3s cycle. Index chosen
      // deterministically from elapsed time, not Math.random.
      if (flashLineRef.current && edgePairsRef.current.length > 0) {
        const flashPeriod = 3.0;
        const flashCycle = elapsed % flashPeriod;
        const flashIndex = Math.floor(elapsed / flashPeriod) % edgePairsRef.current.length;
        const [a, b] = edgePairsRef.current[flashIndex];
        const flashGeom = flashLineRef.current.geometry;
        flashGeom.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z], 3));
        flashGeom.attributes.position.needsUpdate = true;
        const flashOpacity = flashCycle < 0.4 ? Math.sin((flashCycle / 0.4) * Math.PI) : 0;
        (flashLineRef.current.material as THREE.LineBasicMaterial).opacity = flashOpacity * gate;
      }
    }

    if (index === 5) {
      // Specialist agents orbit dynamically, facing the center while bobbing
      const radius = 0.95;
      const bob = 0.03;
      const bobSpeed = 1.3;
      const orbitSpeed = 0.5;
      const angleOffset = elapsed * orbitSpeed;
      if (agentRef1.current) {
        agentRef1.current.position.set(Math.cos(angleOffset) * radius, 0.1 + bob * Math.sin(elapsed * bobSpeed) * gate, Math.sin(angleOffset) * radius);
        agentRef1.current.rotation.set(0, -angleOffset + Math.PI, 0);
      }
      if (agentRef2.current) {
        const a = angleOffset + Math.PI * 2 / 3;
        agentRef2.current.position.set(Math.cos(a) * radius, 0.1 + bob * Math.sin(elapsed * bobSpeed + 2.1) * gate, Math.sin(a) * radius);
        agentRef2.current.rotation.set(0, -a + Math.PI, 0);
      }
      if (agentRef3.current) {
        const a = angleOffset + Math.PI * 4 / 3;
        agentRef3.current.position.set(Math.cos(a) * radius, 0.1 + bob * Math.sin(elapsed * bobSpeed + 4.2) * gate, Math.sin(a) * radius);
        agentRef3.current.rotation.set(0, -a + Math.PI, 0);
      }

      // Rule Forge showcase (v3): dramatizes "T3 authors a compiled rule
      // and sends it down the stack" — the one new fact
      // Context_Aware_Smart_Home_Architecture_v3.md §2.6 adds over v2.
      // Stamps at the core, then sinks LOCALLY within this layer's own
      // group (never travels toward another layer's world position, per
      // the hard same-plane constraint). 6s cycle, elapsed-derived.
      const forgePeriod = 6.0;
      const fcycle = elapsed % forgePeriod;
      let discY = 0.14;
      let discScaleY = 1;
      let discScaleXZ = 1;
      let discOpacity = 0;
      if (fcycle < 0.5) {
        const t = fcycle / 0.5;
        discOpacity = t;
      } else if (fcycle < 0.75) {
        const t = (fcycle - 0.5) / 0.25;
        discOpacity = 1;
        discScaleY = 1 - 0.6 * Math.sin(t * Math.PI);
        discScaleXZ = 1 + 0.15 * Math.sin(t * Math.PI);
      } else if (fcycle < 1.6) {
        const t = (fcycle - 0.75) / 0.85;
        const eased = Math.pow(t, 2);
        discY = THREE.MathUtils.lerp(0.14, -0.25, eased);
        discOpacity = 1 - t;
      } else {
        discOpacity = 0;
        discY = 0.14;
      }
      if (ruleDiscRef.current) {
        ruleDiscRef.current.position.y = discY;
        ruleDiscRef.current.scale.set(discScaleXZ, discScaleY, discScaleXZ);
        const mat = ruleDiscRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = discOpacity * gate;
      }

      if (supervisorHeadRef.current) {
        // Bob up and down and rotate slowly in the center
        supervisorHeadRef.current.position.y = 0.16 + 0.04 * Math.sin(elapsed * 1.5) * gate;
        supervisorHeadRef.current.rotation.y = elapsed * 0.4;
      }
    }
  });

  // Base materials configuration
  const materials = useMemo(() => {
    return {
      socketGold: new THREE.MeshStandardMaterial({
        color: '#d9a98a',
        metalness: 0.9,
        roughness: 0.15,
        transparent: true,
        opacity: 1 - traceProgress,
      }),
      socketBrackets: new THREE.MeshStandardMaterial({
        color: '#4a4137',
        metalness: 0.8,
        roughness: 0.3,
        transparent: true,
        opacity: 1 - traceProgress,
      }),
      copperTraces: new THREE.MeshBasicMaterial({
        color: '#7a7168',
        transparent: true,
        opacity: 0.35 * (1 - traceProgress) + 0.15 * traceProgress,
      }),
      packetMaterial: new THREE.MeshBasicMaterial({
        color: activeColor,
        toneMapped: false,
        transparent: true,
        opacity: 0.9 * (1 - traceProgress), // Data packets disappear in trace form
      }),
      logicTraces: new THREE.MeshBasicMaterial({
        color: activeColor,
        toneMapped: false,
        transparent: true,
        opacity: 0.85 * (1 - traceProgress) + 0.3 * traceProgress,
      }),
      coreCrystal: new THREE.MeshStandardMaterial({
        color: activeColor,
        emissive: activeColor,
        emissiveIntensity: 2.0 * (1 - traceProgress),
        roughness: 0.05,
        transparent: true,
        opacity: 1 - traceProgress,
      }),

      spreaderFrame: new THREE.MeshStandardMaterial({
        color: '#4a4137',
        metalness: 0.8,
        roughness: 0.25,
        transparent: true,
        opacity: 1 - traceProgress,
      }),
      nodesMaterial: new THREE.MeshBasicMaterial({
        color: activeColor,
        toneMapped: false,
        transparent: true,
        opacity: 1 - traceProgress,
        vertexColors: true,
      }),
      netLines: new THREE.LineBasicMaterial({
        color: activeColor,
        transparent: true,
        opacity: 0.25 * traceProgress,
      }),
      brainNode: new THREE.MeshStandardMaterial({
        color: activeColor,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95 * (1 - traceProgress) + 0.05 * traceProgress,
      }),
      agentSpecialist: new THREE.MeshStandardMaterial({
        color: '#d9a98a',
        metalness: 0.95,
        roughness: 0.15,
        transparent: true,
        opacity: 0.9 * (1 - traceProgress) + 0.1 * traceProgress,
      }),
    };
  }, [activeColor, traceProgress]);

  // Procedural geometry for tracing circuit lines
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1.5, 0.01, -1.5,  1.5, 0.01, 1.5,
      -1.5, 0.01, 1.5,   1.5, 0.01, -1.5,
      -1.8, 0.01, 0,     1.8, 0.01, 0,
      0, 0.01, -1.8,     0, 0.01, 1.8,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  // Glowing arched wire bonds from Silicon die to PCB contacts
  const wireGeometries = useMemo(() => {
    return [-0.5, -0.25, 0, 0.25, 0.5].map((pos) => {
      const curveLeft = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.65, 0.09, pos),
        new THREE.Vector3(-0.9, 0.22, pos),
        new THREE.Vector3(-1.15, 0.08, pos)
      );
      const curveRight = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.65, 0.09, pos),
        new THREE.Vector3(0.9, 0.22, pos),
        new THREE.Vector3(1.15, 0.08, pos)
      );
      const leftPoints = curveLeft.getPoints(12).flatMap(p => [p.x, p.y, p.z]);
      const rightPoints = curveRight.getPoints(12).flatMap(p => [p.x, p.y, p.z]);
      
      const geoLeft = new THREE.BufferGeometry();
      geoLeft.setAttribute('position', new THREE.Float32BufferAttribute(leftPoints, 3));
      
      const geoRight = new THREE.BufferGeometry();
      geoRight.setAttribute('position', new THREE.Float32BufferAttribute(rightPoints, 3));
      
      return { left: geoLeft, right: geoRight };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* LAYER 0: BASE PLATE (Socket Base) */}
      {index === 0 && (
        <group>
          {/* Frosted clear base plate */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.35, 4.2]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.08}
              thickness={1.4}
              ior={1.52}
              chromaticAberration={0.06}
              distortion={0.25 * (1 - traceProgress)}
              distortionScale={0.4}
              temporalDistortion={0.08 * (1 - traceProgress)}
              backside={true}
              color="#fcfbfa"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Golden Pin Array underneath (bounces in waves when split) */}
          <group ref={pinsGroupRef} position={[0, -0.18, 0]}>
            {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) =>
              [-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((z) => (
                <mesh key={`${x}-${z}`} position={[x, -0.05, z]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
                  <primitive object={materials.socketGold} attach="material" />
                  <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
                </mesh>
              ))
            )}
          </group>

          {/* Side retention clamps (slide outward as chip rises) */}
          <mesh ref={clampLeftRef} position={[-2.25, 0.05, 0]}>
            <boxGeometry args={[0.2, 0.16, 3.2]} />
            <primitive object={materials.socketBrackets} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>
          <mesh ref={clampRightRef} position={[2.25, 0.05, 0]}>
            <boxGeometry args={[0.2, 0.16, 3.2]} />
            <primitive object={materials.socketBrackets} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Fail-safe pressure gauge — continuous needle sweep */}
          <group position={[0, 0.19, 1.15]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.26, 0.33, 24]} />
              <meshStandardMaterial color="#4a4137" metalness={0.75} roughness={0.3} transparent opacity={1 - traceProgress} />
              <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
            </mesh>
            <group ref={gaugeNeedleRef}>
              <mesh position={[0, 0.015, -0.13]}>
                <boxGeometry args={[0.025, 0.02, 0.24]} />
                <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={1.1} transparent opacity={1 - traceProgress} />
              </mesh>
            </group>
          </group>

          {/* Fail-safe cutoff actuator — latch snap + spark on firing */}
          <group position={[1.55, 0.1, -1.55]}>
            <group ref={latchArmRef}>
              <mesh position={[0, 0.03, 0.12]}>
                <boxGeometry args={[0.06, 0.05, 0.24]} />
                <primitive object={materials.socketBrackets} attach="material" />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
            </group>
            <mesh ref={sparkRef} position={[0, 0.04, 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.09, 12]} />
              <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={0} />
            </mesh>
          </group>

          {/* Perpendicular cooling fins at the back of Layer 0 */}
          <group position={[0, 0.18, -1.5]}>
            {[-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8].map((x, idx) => (
              <mesh key={idx} position={[x, 0.15, 0]}>
                <boxGeometry args={[0.02, 0.3, 0.5]} />
                <meshStandardMaterial color="#7a7168" metalness={0.85} roughness={0.25} transparent opacity={1 - traceProgress} />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* LAYER 1: SILICON SUBSTRATE (Emerald Liquid PCB + Crawling Packets) */}
      {index === 1 && (
        <group>
          {/* Emerald tinted glass card */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.9, 0.14, 3.9]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.15}
              thickness={0.8}
              ior={1.5}
              chromaticAberration={0.05}
              distortion={0.15 * (1 - traceProgress)}
              distortionScale={0.3}
              temporalDistortion={0.05 * (1 - traceProgress)}
              backside={true}
              color="#eaf5ed"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Silicon die at center */}
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[1.3, 0.05, 1.3]} />
            <MeshTransmissionMaterial
              transmission={0.4}
              roughness={0.02}
              thickness={0.3}
              ior={1.6}
              color="#4a5a6a"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Water-ripple pair — expanding rings from the die, rotated flat
              on XZ like every other ring in this file (RingGeometry is
              authored in the XY plane by default; -90deg on X lays it down,
              same convention as Layer 2's existing spinning rings). */}
          <mesh ref={ripple1Ref} position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.58, 32]} />
            <meshBasicMaterial color={activeColor} toneMapped={false} transparent opacity={0} />
          </mesh>
          <mesh ref={ripple2Ref} position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.58, 32]} />
            <meshBasicMaterial color={activeColor} toneMapped={false} transparent opacity={0} />
          </mesh>

          {/* Copper trace routes */}
          <lineSegments geometry={lineGeometry}>
            <primitive object={materials.copperTraces} attach="material" />
          </lineSegments>

          {/* Crawling trace signal packets */}
          <mesh ref={packetRef1}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <primitive object={materials.packetMaterial} attach="material" />
          </mesh>
          <mesh ref={packetRef2}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <primitive object={materials.packetMaterial} attach="material" />
          </mesh>
          <mesh ref={packetRef3}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <primitive object={materials.packetMaterial} attach="material" />
          </mesh>

          {/* Active micro-fan spinning at the corner */}


          {/* Resistors */}
          {[-1.3, -0.8, 0.8].map((x, idx) => (
            <mesh key={idx} position={[x, 0.09, -1.25]} castShadow>
              <boxGeometry args={[0.16, 0.12, 0.16]} />
              <meshStandardMaterial color="#8a5940" roughness={0.4} transparent opacity={1 - traceProgress} />
              <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
            </mesh>
          ))}

          {/* Alexa Hearth brand silkscreen - emissive glow to see through transmissive layers */}
          <Html
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.075, 1.45]}
            pointerEvents="none"
            style={{
              opacity: (1 - traceProgress) * 0.95 + traceProgress * 0.05,
              transition: 'opacity 150ms ease-out',
            }}
          >
            <div className="flex items-center space-x-1.5 font-mono select-none" style={{ color: '#d9a98a', textShadow: '0 0 8px rgba(217, 169, 138, 0.8)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 22h20L12 2z" />
                <path d="M12 18a2.5 2.5 0 0 0 2.5-2.5c0-1.5-2.5-4.5-2.5-4.5s-2.5 3-2.5 4.5a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              <span className="text-[10px] font-black tracking-[0.2em] whitespace-nowrap">ALEXA HEARTH</span>
            </div>
          </Html>

          {/* Autobot Transformers logo - only visible in flat/stacked views */}
          <Html
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-1.3, 0.075, -1.3]}
            pointerEvents="none"
            style={{
              opacity: scrollProgress < 0.20 ? 0.85 : Math.max(0, (1 - (scrollProgress - 0.20) / 0.15) * 0.85),
              transition: 'opacity 150ms ease-out',
            }}
          >
            <div className="flex flex-col items-center select-none opacity-40 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-[#d9a98a]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M10,25 L35,15 L50,5 L65,15 L90,25 L88,60 L50,95 L12,60 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                <polygon points="15,28 32,21 44,30 40,48 18,48" />
                <polygon points="85,28 68,21 56,30 60,48 82,48" />
                <polygon points="46,12 54,12 50,32" />
                <polygon points="18,52 38,52 35,74 24,66" />
                <polygon points="82,52 62,52 65,74 76,66" />
                <rect x="42" y="52" width="4" height="26" />
                <rect x="54" y="52" width="4" height="26" />
                <polygon points="48,52 52,52 50,70" />
                <polygon points="44,82 56,82 50,91" />
              </svg>
            </div>
          </Html>
          
          {/* Dinosaur Silkscreen - always visible */}
          <Html
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            position={[1.3, 0.075, -1.3]}
            pointerEvents="none"
            style={{
              opacity: 0.85,
              transition: 'opacity 150ms ease-out',
            }}
          >
            <div className="flex flex-col items-center select-none opacity-45 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-[#d9a98a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2h4v2h2v4h-2v2h-4v2H8v2H6v2H4v-8h2V8h2V6h2V4h2V2zm-4 12h2v2H8v-2zm4 0h2v2h-2v-2z" />
              </svg>
            </div>
          </Html>

          {/* Retro Game Screen Easter Egg - only visible during side vertical separation dismantle */}
          <Html
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-1.3, 0.075, 1.0]}
            pointerEvents="none"
            style={{
              opacity: oledOpacity,
              transition: 'opacity 150ms ease-out',
            }}
          >
            <RetroGameScreen />
          </Html>

          {/* Micro QR Code */}
          <Html
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            position={[1.3, 0.075, 1.3]}
            pointerEvents="none"
            style={{
              opacity: (1 - traceProgress) * 0.7 + traceProgress * 0.05,
              transition: 'opacity 150ms ease-out',
            }}
          >
            <div className="w-5 h-5 grid grid-cols-5 gap-[1px] bg-black/40 p-[1.5px] rounded-[1px] border border-[#d9a98a]/20">
              {[1,0,1,1,1, 0,1,0,0,1, 1,1,0,1,0, 1,0,1,0,1, 1,1,1,0,1].map((bit, idx) => (
                <div key={idx} className={bit ? 'bg-[#d9a98a]' : 'bg-transparent'} style={{ width: '3px', height: '3px' }} />
              ))}
            </div>
          </Html>
          


          {/* Glowing arched wire bonds from Silicon die to PCB contacts */}
          {wireGeometries.map((geo, idx) => (
            <group key={idx}>
              <primitive object={new THREE.Line(geo.left)}>
                <lineBasicMaterial attach="material" color={ledColor} transparent opacity={0.7 * (1 - traceProgress) + 0.15 * traceProgress} />
              </primitive>
              <primitive object={new THREE.Line(geo.right)}>
                <lineBasicMaterial attach="material" color={ledColor} transparent opacity={0.7 * (1 - traceProgress) + 0.15 * traceProgress} />
              </primitive>
            </group>
          ))}

          {/* Slider Track Left */}
          <group position={[-1.0, 0.08, 0.9]}>
            <mesh>
              <boxGeometry args={[1.2, 0.01, 0.18]} />
              <meshStandardMaterial color="#4a4137" metalness={0.6} roughness={0.4} transparent opacity={1 - traceProgress} />
            </mesh>
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[1.1, 0.005, 0.04]} />
              <meshBasicMaterial color="#1a1816" transparent opacity={1 - traceProgress} />
            </mesh>
            <group ref={cap1Ref} position={[0, 0.01, 0]} scale={[emergence, emergence, emergence]}>
              <mesh position={[0, 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.07, 0.22, 12]} />
                <meshStandardMaterial color="#2d2a26" roughness={0.5} transparent opacity={1 - traceProgress} />
              </mesh>
              <mesh position={[0, 0.12, 0.065]} scale={[1, 1, 0.2]}>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#e9b44c" roughness={0.3} transparent opacity={1 - traceProgress} />
              </mesh>
              <mesh position={[0, 0.23, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.01, 12]} />
                <meshStandardMaterial color="#b8afa4" metalness={0.9} roughness={0.1} transparent opacity={1 - traceProgress} />
              </mesh>
            </group>
          </group>

          {/* Slider Track Right */}
          <group position={[1.0, 0.08, 0.9]}>
            <mesh>
              <boxGeometry args={[1.2, 0.01, 0.18]} />
              <meshStandardMaterial color="#4a4137" metalness={0.6} roughness={0.4} transparent opacity={1 - traceProgress} />
            </mesh>
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[1.1, 0.005, 0.04]} />
              <meshBasicMaterial color="#1a1816" transparent opacity={1 - traceProgress} />
            </mesh>
            <group ref={cap2Ref} position={[0, 0.01, 0]} scale={[emergence, emergence, emergence]}>
              <mesh position={[0, 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.07, 0.22, 12]} />
                <meshStandardMaterial color="#2d2a26" roughness={0.5} transparent opacity={1 - traceProgress} />
              </mesh>
              <mesh position={[0, 0.12, 0.065]} scale={[1, 1, 0.2]}>
                <boxGeometry args={[0.03, 0.22, 0.03]} />
                <meshStandardMaterial color="#ff4b82" roughness={0.3} transparent opacity={1 - traceProgress} />
              </mesh>
              <mesh position={[0, 0.23, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.01, 12]} />
                <meshStandardMaterial color="#b8afa4" metalness={0.9} roughness={0.1} transparent opacity={1 - traceProgress} />
              </mesh>
            </group>
          </group>
        </group>
      )}

      {/* LAYER 2: INTERPOSER (Cyan Glass + Dual Concentric Rings + Orbitals) */}
      {index === 2 && (
        <group>
          {/* Cyan interposer glass plate */}
          <mesh castShadow>
            <boxGeometry args={[3.6, 0.1, 3.6]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.12}
              thickness={0.6}
              ior={1.49}
              chromaticAberration={0.06}
              distortion={0.2 * (1 - traceProgress)}
              distortionScale={0.35}
              temporalDistortion={0.06 * (1 - traceProgress)}
              backside={true}
              color="#e6fcfc"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Neon circuit paths */}
          <lineSegments geometry={lineGeometry}>
            <primitive object={materials.logicTraces} attach="material" />
          </lineSegments>

          {/* Spinning logic ring 1 (Outer) */}
          <mesh ref={ringRef} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 0.8, 32]} />
            <primitive object={materials.logicTraces} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Spinning logic ring 2 (Inner, counter-rotational) */}
          <mesh ref={innerRingRef} position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.54, 0.62, 32]} />
            <primitive object={materials.logicTraces} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Pulsing Core Crystal */}
          <mesh position={[0, 0.07, 0]}>
            <octahedronGeometry args={[0.22]} />
            <primitive object={materials.coreCrystal} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Interlocking Gear Train */}
          <group ref={gearGroupRef} position={[0, 1.2, 0]}>
            {/* Central Gear */}
            <group position={[0, 0, 0]}>
              <mesh>
                <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
                <primitive object={gearMaterial} attach="material" />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const r = 0.31;
                return (
                  <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]} rotation={[0, -angle, 0]}>
                    <boxGeometry args={[0.07, 0.05, 0.04]} />
                    <primitive object={gearMaterial} attach="material" />
                    <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
                  </mesh>
                );
              })}
            </group>

            {/* Left Gear (slides to mesh) */}
            <group ref={gearLeftRef} position={[-0.58, 0, 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.21, 0.21, 0.06, 16]} />
                <primitive object={gearMaterial} attach="material" />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
              {[...Array(9)].map((_, i) => {
                const angle = (i / 9) * Math.PI * 2 + Math.PI / 9;
                const r = 0.23;
                return (
                  <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]} rotation={[0, -angle, 0]}>
                    <boxGeometry args={[0.06, 0.05, 0.04]} />
                    <primitive object={gearMaterial} attach="material" />
                    <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
                  </mesh>
                );
              })}
            </group>

            {/* Right Gear (slides to mesh) */}
            <group ref={gearRightRef} position={[0.58, 0, -0.1]}>
              <mesh>
                <cylinderGeometry args={[0.21, 0.21, 0.06, 16]} />
                <primitive object={gearMaterial} attach="material" />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
              {[...Array(9)].map((_, i) => {
                const angle = (i / 9) * Math.PI * 2 + Math.PI / 9;
                const r = 0.23;
                return (
                  <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]} rotation={[0, -angle, 0]}>
                    <boxGeometry args={[0.06, 0.05, 0.04]} />
                    <primitive object={gearMaterial} attach="material" />
                    <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
                  </mesh>
                );
              })}
            </group>

            <Html position={[0, 0.22, 0]} center style={{ pointerEvents: 'none' }}>
              <div
                ref={gearLabelDivRef}
                style={{
                  opacity: 0,
                  fontFamily: 'monospace',
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: ledColor,
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 4px rgba(0,0,0,0.6)',
                }}
              >
                <span ref={gearLabelSpanRef}>+ACT: PLUG_04</span>
              </div>
            </Html>
          </group>

          {/* Idle reference gear — small, dim, permanently spinning */}
          <group ref={idleGearRef} position={[-1.5, 0.06, 1.5]} scale={[0.5, 0.5, 0.5]}>
            <mesh>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#4a4137" metalness={0.6} roughness={0.35} transparent opacity={0.5 * (1 - traceProgress)} />
              <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
            </mesh>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i / 8) * Math.PI * 2;
              const r = 0.26;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                  rotation={[0, angle, 0]}
                >
                  <boxGeometry args={[0.08, 0.07, 0.05]} />
                  <meshStandardMaterial color="#4a4137" metalness={0.6} roughness={0.35} transparent opacity={0.5 * (1 - traceProgress)} />
                  <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
                </mesh>
              );
            })}
          </group>
        </group>
      )}

      {/* LAYER 3: LOCAL BRAIN (Transmissive Glass + Glowing Cognitive Brain Net) */}
      {index === 3 && (
        <group>
          {/* Glass plate */}
          <mesh castShadow>
            <boxGeometry args={[3.5, 0.08, 3.5]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.06}
              thickness={0.4}
              ior={1.5}
              color="#ffffff"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Terminal ticker shown in all splayed/exploded states */}
          {scrollProgress >= 0.4 && (
            <Html
              transform
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.05, 0]}
              center
              pointerEvents="none"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: scrollProgress < 0.6 ? 'rgba(10,10,12,0.85)' : 'rgba(20,19,18,0.85)',
                  color: '#3bf574',
                  whiteSpace: 'nowrap',
                }}
              >
                <span ref={tickerTextRef}>0x00</span>
                <span ref={tickerCursorRef} style={{ opacity: 1 }}>&#9646;</span>
              </div>
            </Html>
          )}

          {/* Terminal ticker — nested inside the existing traceProgress>0.05
              reveal block below so it fades in with the rest of this
              layer's label, no separate gating needed. */}
        </group>
      )}

      {/* LAYER 4: METAL GATEWAY (Spreader Cover + Constellation Twinkle) */}
      {index === 4 && (
        <group>
          {/* Spreader Outer Frame */}
          <mesh castShadow>
            <boxGeometry args={[3.4, 0.15, 3.4]} />
            <primitive object={materials.spreaderFrame} attach="material" />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Inner crystal clear window */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[2.4, 0.02, 2.4]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.02}
              thickness={0.15}
              ior={1.5}
              color="#ffffff"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Constellation of 16 twinkling nodes + their connections —
              first time this geometry is actually attached to any element;
              the position math already existed in useFrame but had no
              instancedMesh/lineSegments to write into. */}
          <instancedMesh ref={instancedNodesRef} args={[undefined, undefined, 16]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <primitive object={materials.nodesMaterial} attach="material" />
          </instancedMesh>
          <lineSegments ref={connectionLinesRef}>
            <bufferGeometry />
            <primitive object={materials.netLines} attach="material" />
          </lineSegments>
          <lineSegments ref={flashLineRef}>
            <bufferGeometry />
            <lineBasicMaterial color={ledColor} transparent opacity={0} toneMapped={false} />
          </lineSegments>

          {/* Perpendicular antennas in the corners of Layer 4 */}
          {[[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].map(([x, z], idx) => (
            <group key={idx} position={[x, 0.08, z]} scale={[emergence, emergence, emergence]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.35, 8]} />
                <meshStandardMaterial color="#4a4137" metalness={0.9} roughness={0.2} transparent opacity={1 - traceProgress} />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
              <mesh position={[0, 0.175, 0]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={0.8 * (1 - traceProgress)} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* LAYER 5: CLOUD REASONING PLANE (Stateless Bedrock Cloud + Specialist Agents) */}
      {index === 5 && (
        <group>
          {/* Cloud plate — gives Layer 5 the same surrounding border as every other layer */}
          <mesh castShadow>
            <boxGeometry args={[3.3, 0.06, 3.3]} />
            <MeshTransmissionMaterial
              transmission={1.0}
              roughness={0.05}
              thickness={0.35}
              ior={1.5}
              color="#eef4ff"
              transparent
              opacity={1 - traceProgress * 0.85}
            />
            <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
          </mesh>

          {/* Central Supervisor Robot Head */}
          {scrollProgress >= 0.4 && (
            <group ref={supervisorHeadRef} position={[0, 0.16, 0]} scale={[emergence, emergence, emergence]}>
              {/* Head structure */}
              <mesh castShadow>
                <boxGeometry args={[0.3, 0.26, 0.28]} />
                <meshStandardMaterial color="#d9a98a" metalness={0.8} roughness={0.2} transparent opacity={1 - traceProgress * 0.85} />
                <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
              </mesh>
              
              {/* Visor Screen */}
              <mesh position={[0, 0.02, 0.141]}>
                <boxGeometry args={[0.22, 0.08, 0.01]} />
                <meshBasicMaterial color="#141312" transparent opacity={1 - traceProgress * 0.85} />
              </mesh>
              <mesh position={[0, 0.02, 0.147]}>
                <boxGeometry args={[0.18, 0.04, 0.005]} />
                <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={1 - traceProgress * 0.85} />
              </mesh>

              {/* Antennas / Ears */}
              <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
                <meshStandardMaterial color="#4a4137" transparent opacity={1 - traceProgress * 0.85} />
              </mesh>
              <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
                <meshStandardMaterial color="#4a4137" transparent opacity={1 - traceProgress * 0.85} />
              </mesh>

              {/* Top antenna */}
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
                <meshStandardMaterial color="#4a4137" transparent opacity={1 - traceProgress * 0.85} />
              </mesh>
              <mesh position={[0, 0.205, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={1 - traceProgress * 0.85} />
              </mesh>
            </group>
          )}

          {/* Orbiting Specialist Agents - Cute Retro Cartoon Robots */}
          <group ref={agentRef1} scale={[emergence, emergence, emergence]}>
            <CuteRobot ledColor={ledColor} traceProgress={traceProgress} label="COMMERCE" />
          </group>
          <group ref={agentRef2} scale={[emergence, emergence, emergence]}>
            <CuteRobot ledColor={ledColor} traceProgress={traceProgress} label="CONTROL" />
          </group>
          <group ref={agentRef3} scale={[emergence, emergence, emergence]}>
            <CuteRobot ledColor={ledColor} traceProgress={traceProgress} label="SAFETY" />
          </group>

          {/* Rule Forge — v3 showcase: T3 stamps a compiled rule and sends
              it down the stack. Flat disc (cylinder, Y-axis thickness,
              same "flat" convention as every other part in this file). */}
          <mesh ref={ruleDiscRef} position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.03, 20]} />
            <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={1.6} roughness={0.15} transparent opacity={0} />
          </mesh>


        </group>
      )}

      {/* 3D Pointer Schematic Line & Responsive HTML Label (Blueprint style) */}
      {traceProgress > 0.0 && (
        <group>
          {/* 3D pointer line */}
          <line>
            <bufferGeometry>
              <float32BufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array(
                    index % 2 === 0
                      ? (index < 3 
                          ? [0, 0.1, 0,   0, 0.1, -4.5,   -3.4, 0.1, -4.5]
                          : [0, 0.1, 0,   0, 0.1, -4.5,   3.4, 0.1, -4.5])
                      : (index < 3
                          ? [0, 0.1, 0,   0, 0.1, 4.8,    -3.4, 0.1, 4.8]
                          : [0, 0.1, 0,   0, 0.1, 4.8,    3.4, 0.1, 4.8])
                  ),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#4a4137" transparent opacity={traceProgress} linewidth={1.5} />
          </line>

          {/* Core targets ring */}
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.07, 0.09, 16]} />
            <meshBasicMaterial color={ledColor} transparent opacity={traceProgress} />
          </mesh>

          {/* HTML Label component, positioned in 3D, center-aligned, with distanceFactor scaling */}
          <Html
            position={
              index % 2 === 0
                ? (index < 3 ? [-3.5, 0.1, -4.5] : [3.5, 0.1, -4.5])
                : (index < 3 ? [-3.5, 0.1, 4.8] : [3.5, 0.1, 4.8])
            }
            center
            style={{
              opacity: traceProgress,
              transition: 'opacity 150ms ease-out',
              pointerEvents: 'none',
            }}
          >
            <div 
              className="flex flex-col p-3 rounded-[var(--r-md)] border backdrop-blur-md transition-colors duration-150 shadow-md"
              style={{
                width: '210px',
                borderColor: 'rgba(74, 65, 55, 0.2)',
                backgroundColor: scrollProgress < 0.6 ? 'rgba(15,15,17,0.85)' : 'rgba(255, 255, 255, 0.78)',
                color: scrollProgress < 0.6 ? '#e0dbd5' : '#1a1816',
                textAlign: index < 3 ? 'right' : 'left',
                alignItems: index < 3 ? 'flex-end' : 'flex-start',
              }}
            >
              <span className="text-[7px] font-mono tracking-widest font-bold opacity-60">LAYER {index}</span>
              <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5" style={{ color: ledColor }}>{currentDetails.title}</span>
              <p className="text-[8px] font-mono leading-normal mt-1 opacity-80" style={{ margin: 0 }}>{currentDetails.desc}</p>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

interface CuteRobotProps {
  ledColor: string;
  traceProgress: number;
  label: string;
}

function CuteRobot({ ledColor, traceProgress, label }: CuteRobotProps) {
  const robotMaterials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: '#d9a98a',
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9 * (1 - traceProgress) + 0.1 * traceProgress,
      }),
      screen: new THREE.MeshBasicMaterial({
        color: '#141312',
        transparent: true,
        opacity: 0.9 * (1 - traceProgress) + 0.1 * traceProgress,
      }),
    };
  }, [ledColor, traceProgress]);

  return (
    <group scale={[0.8, 0.8, 0.8]}>
      {/* Robot Body */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.15, 0.18]} />
        <primitive object={robotMaterials.body} attach="material" />
        <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
      </mesh>
      
      {/* Head */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.13, 0.1, 0.13]} />
        <primitive object={robotMaterials.body} attach="material" />
        <Edges color="#4a4137" threshold={15} transparent opacity={traceProgress} />
      </mesh>
      
      {/* Screen Face */}
      <mesh position={[0, 0.22, 0.066]}>
        <boxGeometry args={[0.1, 0.07, 0.01]} />
        <primitive object={robotMaterials.screen} attach="material" />
      </mesh>
      
      {/* Glowing Face Visor/Pixels */}
      <Html transform rotation={[0, 0, 0]} position={[0, 0.22, 0.073]} pointerEvents="none" scale={[0.15, 0.15, 0.15]}>
        <div className="flex flex-col items-center justify-center font-mono select-none" style={{ color: ledColor, textShadow: `0 0 4px ${ledColor}` }}>
          <span className="text-[8px] font-black tracking-widest leading-none">^ . ^</span>
          <span className="text-[4px] font-bold tracking-widest uppercase mt-0.5 opacity-80">{label}</span>
        </div>
      </Html>
      
      {/* Tiny Antenna */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.06, 8]} />
        <meshStandardMaterial color="#4a4137" transparent opacity={1 - traceProgress} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={1 - traceProgress} />
      </mesh>
      
      {/* Left Arm */}
      <mesh position={[-0.105, 0.1, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
        <primitive object={robotMaterials.body} attach="material" />
      </mesh>
      
      {/* Right Arm */}
      <mesh position={[0.105, 0.1, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
        <primitive object={robotMaterials.body} attach="material" />
      </mesh>
      
      {/* Hover Wheel/Ring underneath */}
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 16]} />
        <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={0.6 * (1 - traceProgress)} />
      </mesh>
    </group>
  );
}

function RetroGameScreen() {
  const [invaderX, setInvaderX] = useState(10);
  const [direction, setDirection] = useState(1);
  const [laserY, setLaserY] = useState(-1);
  
  useEffect(() => {
    const gameTimer = setInterval(() => {
      setInvaderX((prev) => {
        let next = prev + direction * 2;
        if (next > 28 || next < 2) {
          setDirection((d) => -d);
          return prev;
        }
        return next;
      });
      
      setLaserY((prev) => {
        if (prev < 0) {
          if (Math.random() < 0.08) return 20;
          return -1;
        }
        return prev - 2;
      });
    }, 120);
    return () => clearInterval(gameTimer);
  }, [direction]);

  return (
    <div
      style={{
        width: '40px',
        height: '24px',
        backgroundColor: '#0a100c',
        border: '1.5px solid #2d4538',
        borderRadius: '2px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 6px rgba(59, 245, 116, 0.4)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${invaderX}px`,
          top: '3px',
          color: '#3bf574',
          fontSize: '7px',
          fontWeight: 'black',
          fontFamily: 'monospace',
          lineHeight: 1,
          textShadow: '0 0 3px #3bf574',
        }}
      >
        👾
      </div>
      <div
        style={{
          position: 'absolute',
          left: '17px',
          top: '16px',
          color: '#3bf574',
          fontSize: '6px',
          fontFamily: 'monospace',
          lineHeight: 1,
        }}
      >
        ▲
      </div>
      {laserY >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: `${laserY}px`,
            width: '1px',
            height: '3px',
            backgroundColor: '#3bf574',
            boxShadow: '0 0 2px #3bf574',
          }}
        />
      )}
    </div>
  );
}

export default LayerGroup;
