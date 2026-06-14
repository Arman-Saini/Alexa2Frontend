import * as THREE from 'three';

// Module-level ref so DigitalTwinCanvas (outside Canvas) can access the Three.js camera
// for drag-and-drop raycasting.
export const sharedCameraRef: { current: THREE.Camera | null } = { current: null };
