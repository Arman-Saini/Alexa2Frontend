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

const DEVICE_GEOMETRY: Record<string, { w: number; h: number; d: number }> = {
  'smart-bulb':    { w: 0.2, h: 0.3, d: 0.2 },
  'echo-dot':      { w: 0.3, h: 0.12, d: 0.3 },
  'echo-show':     { w: 0.5, h: 0.4, d: 0.1 },
  'smart-plug':    { w: 0.1, h: 0.12, d: 0.1 },
  'motion-sensor': { w: 0.15, h: 0.15, d: 0.1 },
  'thermostat':    { w: 0.25, h: 0.35, d: 0.05 },
  'smart-lock':    { w: 0.12, h: 0.2, d: 0.08 },
  camera:          { w: 0.2, h: 0.15, d: 0.2 },
  'smoke-detector': { w: 0.25, h: 0.08, d: 0.25 },
  sofa:            { w: 1.8, h: 0.7, d: 0.8 },
  bed:             { w: 1.6, h: 0.5, d: 2.1 },
  table:           { w: 1.2, h: 0.75, d: 0.8 },
  chair:           { w: 0.6, h: 0.85, d: 0.6 },
  'tv-stand':      { w: 1.5, h: 0.5, d: 0.45 },
  bookshelf:       { w: 0.9, h: 1.8, d: 0.3 },
  bathtub:         { w: 0.75, h: 0.5, d: 1.6 },
  desk:            { w: 1.4, h: 0.75, d: 0.7 },
};

export function PlacedObjectMesh({ obj }: PlacedObjectMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { setSelectedObject, ui } = useAppStore();
  const selectedObjectId = ui.selectedObjectId;

  const def = ASSET_MAP.get(obj.type);
  const geo = DEVICE_GEOMETRY[obj.type] ?? { w: 0.4, h: 0.4, d: 0.4 };
  const isSelected = selectedObjectId === obj.id;
  const isOn = obj.alexaDeviceState.isOn;

  const baseColor = obj.color ?? def?.color ?? '#888';
  const emissiveColor = isOn && obj.isAlexaDevice ? baseColor : '#000';

  // Gentle float for IoT devices
  useFrame(() => {
    if (meshRef.current && obj.isAlexaDevice && isOn) {
      meshRef.current.position.y =
        obj.position.y + geo.h / 2 + Math.sin(Date.now() * 0.002) * 0.03;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (ui.isPlacementMode) return;
    e.stopPropagation();
    setSelectedObject(isSelected ? null : obj.id);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[obj.position.x, obj.position.y + geo.h / 2, obj.position.z]}
        rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[geo.w, geo.h, geo.d]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={isOn && obj.isAlexaDevice ? 0.4 : 0}
          roughness={0.6}
          metalness={0.2}
          transparent={isSelected}
          opacity={isSelected ? 0.9 : 1}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh
          position={[obj.position.x, obj.position.y + geo.h / 2, obj.position.z]}
        >
          <boxGeometry args={[geo.w + 0.08, geo.h + 0.08, geo.d + 0.08]} />
          <meshBasicMaterial color="#00CAFF" wireframe />
        </mesh>
      )}

      {/* Tooltip on hover */}
      {hovered && !isSelected && (
        <Html
          position={[obj.position.x, obj.position.y + geo.h + 0.3, obj.position.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-alexa-dark border border-alexa-blue rounded px-2 py-1 text-xs text-white whitespace-nowrap">
            <span className="mr-1">{def?.emoji}</span>
            {obj.deviceName}
            {obj.isAlexaDevice && (
              <span className={`ml-2 ${isOn ? 'text-green-400' : 'text-red-400'}`}>
                {isOn ? '● ON' : '○ OFF'}
              </span>
            )}
          </div>
        </Html>
      )}

      {/* Glowing point light for active IoT devices */}
      {obj.isAlexaDevice && isOn && (
        <pointLight
          position={[obj.position.x, obj.position.y + geo.h + 0.1, obj.position.z]}
          intensity={0.5}
          distance={2}
          color={baseColor}
        />
      )}
    </group>
  );
}
