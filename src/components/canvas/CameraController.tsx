import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

const HOUSE_VIEW = {
  position: new THREE.Vector3(0, 20, 16),
  target: new THREE.Vector3(0, 0, 0),
};

function getRoomView(room: { position: { x: number; y: number; z: number }; width: number; depth: number }) {
  const maxDim = Math.max(room.width, room.depth);
  const elevation = Math.max(maxDim * 1.4, 6);
  const offset = Math.max(maxDim * 0.9, 4);
  return {
    position: new THREE.Vector3(room.position.x, elevation, room.position.z + offset),
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
  const speed = useRef(0.012); // transition speed

  useEffect(() => {
    if (!activeRoomId) {
      targetPos.current.copy(HOUSE_VIEW.position);
      targetLook.current.copy(HOUSE_VIEW.target);
      speed.current = 0.01;
    } else {
      const room = rooms.find((r) => r.id === activeRoomId);
      if (room) {
        const view = getRoomView(room);
        targetPos.current.copy(view.position);
        targetLook.current.copy(view.target);
        speed.current = 0.014;
      }
    }
  }, [activeRoomId, rooms]);

  useFrame((_, delta) => {
    // Exponential smooth lerp: feels like easing without GSAP
    const lerpT = 1 - Math.exp(-speed.current * 60 * delta);
    camera.position.lerp(targetPos.current, lerpT);
    currentLook.current.lerp(targetLook.current, lerpT);
    camera.lookAt(currentLook.current);
  });

  return null;
}
