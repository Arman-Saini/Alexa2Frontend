import * as THREE from 'three';

// 4-step cel-shading gradient: deep shadow → shadow → midtone → highlight.
// Created once at module load (no WebGL context needed for DataTexture construction).
export const TOON_GRADIENT = (() => {
  const data = new Uint8Array([0, 80, 160, 255]);
  const t = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
