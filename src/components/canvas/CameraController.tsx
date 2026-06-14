import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

// Classic isometric offset direction (1,1,1 normalized, scaled)
const ISO_DIST = 22;
const ISO_POS = new THREE.Vector3(ISO_DIST, ISO_DIST * 0.9, ISO_DIST);

const HOUSE_VIEW = {
  position: ISO_POS.clone(),
  target: new THREE.Vector3(0, 0, 0),
  zoom: 32,
};

function getRoomView(room: { position: { x: number; y: number; z: number }; width: number; depth: number }) {
  const rx = room.position.x;
  const rz = room.position.z;
  const maxDim = Math.max(room.width, room.depth);
  const d = maxDim * 1.5;
  return {
    position: new THREE.Vector3(rx + d, d * 0.9, rz + d),
    target: new THREE.Vector3(rx, 0, rz),
    zoom: Math.max(55, 220 / maxDim),
  };
}

export function CameraController() {
  const { camera } = useThree();
  const { ui, rooms } = useAppStore();
  const { activeRoomId } = ui;

  const targetPos  = useRef(HOUSE_VIEW.position.clone());
  const targetLook = useRef(HOUSE_VIEW.target.clone());
  const currentLook = useRef(HOUSE_VIEW.target.clone());
  const targetZoom = useRef(HOUSE_VIEW.zoom);

  useEffect(() => {
    if (!activeRoomId) {
      targetPos.current.copy(HOUSE_VIEW.position);
      targetLook.current.copy(HOUSE_VIEW.target);
      targetZoom.current = HOUSE_VIEW.zoom;
    } else {
      const room = rooms.find((r) => r.id === activeRoomId);
      if (room) {
        const v = getRoomView(room);
        targetPos.current.copy(v.position);
        targetLook.current.copy(v.target);
        targetZoom.current = v.zoom;
      }
    }
  }, [activeRoomId, rooms]);

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-0.014 * 60 * delta);
    camera.position.lerp(targetPos.current, t);
    currentLook.current.lerp(targetLook.current, t);
    camera.lookAt(currentLook.current);

    // Lerp orthographic zoom
    const ortho = camera as THREE.OrthographicCamera;
    if (ortho.isOrthographicCamera) {
      const dz = targetZoom.current - ortho.zoom;
      if (Math.abs(dz) > 0.05) {
        ortho.zoom += dz * t;
        ortho.updateProjectionMatrix();
      }
    }
  });

  return null;
}
