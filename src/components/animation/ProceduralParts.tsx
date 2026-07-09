import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------
// SHARED: flat-shaded toon part with an inverted-hull ink outline.
// Same technique as frontend/src/components/cartoon/CuteAlexaModel.tsx:
// a duplicate mesh, scaled up slightly, BackSide-only material.
// ---------------------------------------------------------------
export interface ToonPartProps {
  color: string;
  outlineColor: string;
  outlineScale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: React.ReactElement;
}

export function ToonPart({
  color,
  outlineColor,
  outlineScale = 1.02,
  position,
  rotation,
  castShadow,
  receiveShadow,
  children,
}: ToonPartProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        {children}
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={outlineScale}>
        {children}
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------
// Central shaft — fixed in place, layers slide along it when exploded.
// Sized to span from the Cloud Base (y=0) to the fully-expanded
// Acoustic Ring (y=4.8, see LAYERS in EngineAssembly.tsx) plus padding.
// ---------------------------------------------------------------
export function CoreShaft({ isWhiteTheme }: { isWhiteTheme: boolean }) {
  return (
    <ToonPart
      color={isWhiteTheme ? '#8A5940' : '#241F1B'}
      outlineColor="#050505"
      position={[0, 2.2, 0]}
    >
      <cylinderGeometry args={[0.35, 0.35, 6.2, 24]} />
    </ToonPart>
  );
}
