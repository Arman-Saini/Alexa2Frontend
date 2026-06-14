import { useRef, useState } from 'react';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { ASSET_MAP } from '../../constants/assets';
import type { PlacedObject } from '../../types';

interface PlacedObjectMeshProps {
  obj: PlacedObject;
}

// Geometry definitions per device type
const GEOM: Record<string, { w: number; h: number; d: number; shape?: 'cylinder' | 'sphere' | 'box' }> = {
  'smart-bulb':     { w: 0.18, h: 0.28, d: 0.18, shape: 'sphere' },
  'echo-dot':       { w: 0.32, h: 0.1,  d: 0.32, shape: 'cylinder' },
  'echo-show':      { w: 0.5,  h: 0.4,  d: 0.08 },
  'smart-plug':     { w: 0.1,  h: 0.14, d: 0.1 },
  'motion-sensor':  { w: 0.14, h: 0.14, d: 0.1 },
  'thermostat':     { w: 0.24, h: 0.32, d: 0.05 },
  'smart-lock':     { w: 0.1,  h: 0.2,  d: 0.06 },
  camera:           { w: 0.18, h: 0.12, d: 0.18 },
  'smoke-detector': { w: 0.24, h: 0.07, d: 0.24, shape: 'cylinder' },
  'smart-tv':       { w: 1.4,  h: 0.8,  d: 0.06 },
  'ceiling-fan':    { w: 0.8,  h: 0.06, d: 0.8 },
  doorbell:         { w: 0.1,  h: 0.16, d: 0.06 },
  'air-purifier':   { w: 0.28, h: 0.6,  d: 0.28 },
  sofa:             { w: 1.8,  h: 0.7,  d: 0.8 },
  bed:              { w: 1.6,  h: 0.5,  d: 2.1 },
  table:            { w: 1.2,  h: 0.75, d: 0.8 },
  chair:            { w: 0.6,  h: 0.85, d: 0.6 },
  'tv-stand':       { w: 1.5,  h: 0.5,  d: 0.45 },
  bookshelf:        { w: 0.9,  h: 1.8,  d: 0.3 },
  bathtub:          { w: 0.75, h: 0.5,  d: 1.6 },
  desk:             { w: 1.4,  h: 0.75, d: 0.7 },
  plant:            { w: 0.35, h: 0.6,  d: 0.35, shape: 'sphere' },
  wardrobe:         { w: 1.2,  h: 2.0,  d: 0.55 },
};

export function PlacedObjectMesh({ obj }: PlacedObjectMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { setSelectedObject, ui } = useAppStore();
  const selectedObjectId = ui.selectedObjectId;

  const def = ASSET_MAP.get(obj.type);
  const geo = GEOM[obj.type] ?? { w: 0.4, h: 0.4, d: 0.4 };
  const isSelected = selectedObjectId === obj.id;
  const isOn = obj.alexaDeviceState.isOn;

  const baseColor = obj.color ?? def?.color ?? '#888';
  const emissiveColor = isOn && obj.isAlexaDevice ? baseColor : '#000000';
  const emissiveIntensity = isOn && obj.isAlexaDevice ? 0.5 : 0;

  // Float animation for active IoT devices
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (obj.isAlexaDevice && isOn) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.2 + obj.position.x) * 0.025;
    } else {
      groupRef.current.position.y = 0;
    }
    // Ceiling fan rotation
    if (obj.type === 'ceiling-fan' && isOn && meshRef.current) {
      meshRef.current.rotation.y += 0.08 * (obj.alexaDeviceState.speed ?? 2);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (ui.isPlacementMode) return;
    e.stopPropagation();
    setSelectedObject(isSelected ? null : obj.id);
  };

  const px = obj.position.x;
  const py = obj.position.y;
  const pz = obj.position.z;

  return (
    <group ref={groupRef} position={[px, py, pz]}>
      {/* Main mesh */}
      <mesh
        ref={meshRef}
        position={[0, geo.h / 2, 0]}
        rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        {geo.shape === 'cylinder' ? (
          <cylinderGeometry args={[geo.w / 2, geo.w / 2 + 0.02, geo.h, 24]} />
        ) : geo.shape === 'sphere' ? (
          <sphereGeometry args={[geo.w / 2, 16, 12]} />
        ) : (
          <boxGeometry args={[geo.w, geo.h, geo.d]} />
        )}
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={obj.isAlexaDevice ? 0.4 : 0.75}
          metalness={obj.isAlexaDevice ? 0.3 : 0.05}
          transparent={isSelected}
          opacity={isSelected ? 0.85 : 1}
        />
      </mesh>

      {/* Echo Dot ring accent */}
      {obj.type === 'echo-dot' && (
        <mesh position={[0, geo.h + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[geo.w / 2 - 0.04, geo.w / 2, 32]} />
          <meshBasicMaterial
            color={isOn ? '#00A8E0' : '#333355'}
            transparent
            opacity={isOn ? 0.9 : 0.4}
          />
        </mesh>
      )}

      {/* Smart bulb stem */}
      {obj.type === 'smart-bulb' && (
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.12, 8]} />
          <meshStandardMaterial color="#888888" roughness={0.5} metalness={0.6} />
        </mesh>
      )}

      {/* Plant pot */}
      {obj.type === 'plant' && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.18, 12]} />
          <meshStandardMaterial color="#8B4513" roughness={0.85} />
        </mesh>
      )}

      {/* Smart TV screen */}
      {obj.type === 'smart-tv' && isOn && (
        <mesh position={[0, geo.h / 2, geo.d / 2 + 0.001]} rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}>
          <planeGeometry args={[geo.w - 0.05, geo.h - 0.06]} />
          <meshBasicMaterial color="#0a0a2a" />
        </mesh>
      )}

      {/* Selection outline */}
      {isSelected && (
        <mesh position={[0, geo.h / 2, 0]}>
          {geo.shape === 'cylinder' ? (
            <cylinderGeometry args={[geo.w / 2 + 0.04, geo.w / 2 + 0.06, geo.h + 0.06, 24]} />
          ) : (
            <boxGeometry args={[geo.w + 0.08, geo.h + 0.08, geo.d + 0.08]} />
          )}
          <meshBasicMaterial color="#00A8E0" wireframe />
        </mesh>
      )}

      {/* Status LED dot for Alexa devices */}
      {obj.isAlexaDevice && (
        <mesh position={[geo.w / 2 - 0.03, geo.h + 0.02, geo.d / 2 - 0.03]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshBasicMaterial color={isOn ? '#1DB954' : '#383838'} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && !isSelected && (
        <Html
          position={[0, geo.h + 0.35, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-[#1A1A1A] border border-[#383838] rounded-xl px-2.5 py-1.5 text-xs text-white whitespace-nowrap shadow-2xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span>{def?.emoji}</span>
              <span className="font-semibold">{obj.deviceName}</span>
            </div>
            {obj.isAlexaDevice && (
              <div className={`flex items-center gap-1 ${isOn ? 'text-[#1DB954]' : 'text-[#8A8A8A]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-[#1DB954]' : 'bg-[#383838]'}`} />
                <span>{isOn ? 'On' : 'Off'}</span>
                {isOn && obj.alexaDeviceState.powerConsumption !== undefined && (
                  <span className="text-[#8A8A8A] ml-1">· {obj.alexaDeviceState.powerConsumption.toFixed(0)}W</span>
                )}
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Glowing point light for active bulbs */}
      {obj.type === 'smart-bulb' && isOn && (
        <pointLight
          position={[0, geo.h + 0.1, 0]}
          intensity={0.8}
          distance={3.5}
          color={baseColor}
          castShadow={false}
        />
      )}

      {/* Ambient glow for active echo devices */}
      {(obj.type === 'echo-dot' || obj.type === 'echo-show') && isOn && (
        <pointLight
          position={[0, 0.2, 0]}
          intensity={0.3}
          distance={1.5}
          color="#00A8E0"
        />
      )}
    </group>
  );
}
