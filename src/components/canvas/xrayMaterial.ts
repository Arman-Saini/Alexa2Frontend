import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import { colors } from '../../theme/tokens';

// Emissive rim-glow + sweep-band "x-ray" accent used by XRayEffect. Fresnel rim gives
// a wireframe/edge-glow read; a bright horizontal band travels through uScanY to sell
// the "scanning" motion. Restrained brief accent, not a screen-filling effect.

function hexToVec3(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

const DEFAULT_COLOR = hexToVec3(colors.ember[500]);

export const XRayMaterial = shaderMaterial(
  {
    uScanY: 0,
    uColor: new THREE.Vector3(...DEFAULT_COLOR),
    uOpacity: 1,
    uTime: 0,
  },
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - worldPosition.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  /* glsl */ `
    uniform float uScanY;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;

    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    void main() {
      // Fresnel rim , brighter at grazing angles, dim head-on.
      float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), 2.2);

      // Sweep band , bright near uScanY, fading with distance above/below.
      float dist = abs(vWorldPos.y - uScanY);
      float band = smoothstep(0.55, 0.0, dist);

      // Subtle flicker so the sweep doesn't feel static.
      float flicker = 0.94 + 0.06 * sin(uTime * 18.0 + vWorldPos.x * 4.0);

      float glow = clamp(fresnel * 0.6 + band * 1.4, 0.0, 1.6) * flicker;
      vec3 col = uColor * glow;

      float alpha = clamp(glow, 0.0, 1.0) * uOpacity;
      gl_FragColor = vec4(col, alpha);
    }
  `,
);

extend({ XRayMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    xRayMaterial: ThreeElement<typeof XRayMaterial>;
  }
}
