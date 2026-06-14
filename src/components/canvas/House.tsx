import { useRef } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { RoomMesh } from './RoomMesh';
import { PlacedObjectMesh } from './PlacedObjectMesh';

export function House() {
  const { ui, rooms, placedObjects, addPlacedObject, exitPlacementMode } = useAppStore();
  const { activeRoomId, isPlacementMode, placementAssetType, hoveredRoomId } = ui;
  const groundRef = useRef<THREE.Mesh>(null);

  // Determine which rooms to show
  const visibleRooms = activeRoomId
    ? rooms.filter((r) => r.id === activeRoomId)
    : rooms;

  // Determine which objects to show
  const visibleObjects = activeRoomId
    ? placedObjects.filter((o) => o.parentRoomId === activeRoomId)
    : placedObjects;

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isPlacementMode || !placementAssetType) return;
    e.stopPropagation();

    const point = e.point;

    // Determine which room the click landed in
    let targetRoomId: string | null = null;
    for (const room of rooms) {
      const rx = room.position.x;
      const rz = room.position.z;
      const hw = room.width / 2;
      const hd = room.depth / 2;
      if (
        point.x >= rx - hw &&
        point.x <= rx + hw &&
        point.z >= rz - hd &&
        point.z <= rz + hd
      ) {
        targetRoomId = room.id;
        break;
      }
    }

    addPlacedObject(placementAssetType, { x: point.x, y: 0, z: point.z }, targetRoomId);
    exitPlacementMode();
  };

  return (
    <group>
      {/* Invisible ground plane to catch placement clicks */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleFloorClick}
        visible={false}
      >
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial />
      </mesh>

      {/* Grid helper */}
      <Grid
        position={[0, -0.005, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1e2d4a"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#253555"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Rooms */}
      {visibleRooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          isActive={activeRoomId === room.id}
          isHovered={hoveredRoomId === room.id}
        />
      ))}

      {/* Placed objects */}
      {visibleObjects.map((obj) => (
        <PlacedObjectMesh key={obj.id} obj={obj} />
      ))}

      {/* Ambient base plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0a0f1a" roughness={1} />
      </mesh>
    </group>
  );
}
