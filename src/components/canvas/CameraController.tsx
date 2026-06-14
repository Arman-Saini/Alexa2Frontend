import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

const ISO_DIST = 26;
const ISO_POS  = new THREE.Vector3(ISO_DIST, ISO_DIST * 0.88, ISO_DIST);

const HOUSE_VIEW = {
  position: ISO_POS.clone(),
  target:   new THREE.Vector3(0, 0, 0),
  zoom:     22,   // Less zoomed-in default so the full house is clearly visible
};

function getRoomView(room: { position: { x: number; y: number; z: number }; width: number; depth: number }) {
  const rx = room.position.x;
  const rz = room.position.z;
  const maxDim = Math.max(room.width, room.depth);
  const d    = maxDim * 0.85;
  const zoom = Math.min(88, Math.max(36, 680 / maxDim));
  return {
    position: new THREE.Vector3(rx + d, d * 0.9, rz + d),
    target:   new THREE.Vector3(rx, 0, rz),
    zoom,
  };
}

export function CameraController() {
  const { camera } = useThree();
  const { ui, rooms } = useAppStore();
  const { activeRoomId } = ui;

  const targetPos    = useRef(HOUSE_VIEW.position.clone());
  const targetLook   = useRef(HOUSE_VIEW.target.clone());
  const currentLook  = useRef(HOUSE_VIEW.target.clone());
  const targetZoom   = useRef(HOUSE_VIEW.zoom);

  // Only animate when a room change triggers a transition.
  // When idle, OrbitControls owns the camera — the controller must not fight it.
  const transitioning  = useRef(false);
  const prevRoomId     = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Skip on mount (prevRoomId starts undefined)
    if (prevRoomId.current === undefined) {
      prevRoomId.current = activeRoomId;
      return;
    }
    if (activeRoomId === prevRoomId.current) return;
    prevRoomId.current = activeRoomId;

    transitioning.current = true;

    if (!activeRoomId) {
      targetPos.current.copy(HOUSE_VIEW.position);
      targetLook.current.copy(HOUSE_VIEW.target);
      targetZoom.current = HOUSE_VIEW.zoom;
    } else {
      const room = rooms.find(r => r.id === activeRoomId);
      if (room) {
        const v = getRoomView(room);
        targetPos.current.copy(v.position);
        targetLook.current.copy(v.target);
        targetZoom.current = v.zoom;
      }
    }
  }, [activeRoomId, rooms]);

  useFrame((_, delta) => {
    if (!transitioning.current) return;   // yield to OrbitControls when idle

    const t = 1 - Math.exp(-0.014 * 60 * delta);

    camera.position.lerp(targetPos.current, t);
    currentLook.current.lerp(targetLook.current, t);
    camera.lookAt(currentLook.current);

    const ortho = camera as THREE.OrthographicCamera;
    if (ortho.isOrthographicCamera) {
      const dz = targetZoom.current - ortho.zoom;
      ortho.zoom += dz * t;
      ortho.updateProjectionMatrix();
    }

    // Mark transition done once close enough — hand control back to OrbitControls
    const posClose  = camera.position.distanceTo(targetPos.current) < 0.08;
    const zoomClose = Math.abs((camera as THREE.OrthographicCamera).zoom - targetZoom.current) < 0.4;
    if (posClose && zoomClose) {
      transitioning.current = false;
    }
  });

  return null;
}
