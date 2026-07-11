import * as THREE from 'three';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

// Hand-authored camera keyframes keyed by progress (from 0 to 1)
const KEYFRAMES: { progress: number; state: CameraState }[] = [
  {
    progress: 0.0,
    state: {
      position: new THREE.Vector3(45, 30, 45), // Wide establishing shot
      target: new THREE.Vector3(0, 0, 0),
      zoom: 22,
    },
  },
  {
    progress: 0.25,
    state: {
      position: new THREE.Vector3(12, 10, 12), // Kitchen push-in
      target: new THREE.Vector3(5, 0.5, 5),
      zoom: 56,
    },
  },
  {
    progress: 0.5,
    state: {
      position: new THREE.Vector3(22, 15, 22), // Hallway pull-back
      target: new THREE.Vector3(0, 0.5, 0),
      zoom: 34,
    },
  },
  {
    progress: 0.75,
    state: {
      position: new THREE.Vector3(10, 28, 10), // Upward cloud-escalation tilt
      target: new THREE.Vector3(0, 4, 0),
      zoom: 45,
    },
  },
  {
    progress: 1.0,
    state: {
      position: new THREE.Vector3(28, 25.2, 28), // Settle back to default HOUSE_VIEW (ISO_DIST = 28)
      target: new THREE.Vector3(0, 0, 0),
      zoom: 30,
    },
  },
];

export function getStoryCameraState(progress: number): CameraState {
  const p = Math.max(0, Math.min(1, progress));

  // Find the keyframe segment
  let startIndex = 0;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].progress && p <= KEYFRAMES[i + 1].progress) {
      startIndex = i;
      break;
    }
  }

  const start = KEYFRAMES[startIndex];
  const end = KEYFRAMES[startIndex + 1];

  // Avoid division by zero if progress keyframes are identical
  const range = end.progress - start.progress;
  const t = range > 0 ? (p - start.progress) / range : 0;

  return {
    position: new THREE.Vector3().lerpVectors(start.state.position, end.state.position, t),
    target: new THREE.Vector3().lerpVectors(start.state.target, end.state.target, t),
    zoom: start.state.zoom + (end.state.zoom - start.state.zoom) * t,
  };
}
