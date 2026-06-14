import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

// Target camera positions for house view and each room
const HOUSE_VIEW = {
  position: new THREE.Vector3(0, 18, 14),
  target: new THREE.Vector3(0, 0, 0),
};

function getRoomView(room: { position: { x: number; y: number; z: number }; width: number; depth: number }) {
  const maxDim = Math.max(room.width, room.depth);
  const elevation = maxDim * 1.6;
  return {
    position: new THREE.Vector3(room.position.x, elevation, room.position.z + maxDim),
    target: new THREE.Vector3(room.position.x, 0, room.position.z),
  };
}

export function CameraController() {
  const { camera } = useThree();
  const { ui, rooms } = useAppStore();
  const { activeRoomId } = ui;

  const targetPos = useRef(HOUSE_VIEW.position.clone());
  const targetLook = useRef(HOUSE_VIEW.target.clone());
  const currentLook = useRef(HOUSE_VIEW.target.clone());

  useEffect(() => {
    if (!activeRoomId) {
      targetPos.current.copy(HOUSE_VIEW.position);
      targetLook.current.copy(HOUSE_VIEW.target);
    } else {
      const room = rooms.find((r) => r.id === activeRoomId);
      if (room) {
        const view = getRoomView(room);
        targetPos.current.copy(view.position);
        targetLook.current.copy(view.target);
      }
    }
  }, [activeRoomId, rooms]);

  useFrame((_, delta) => {
    const lerpFactor = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetPos.current, lerpFactor);
    currentLook.current.lerp(targetLook.current, lerpFactor);
    camera.lookAt(currentLook.current);
  });

  return null;
}
