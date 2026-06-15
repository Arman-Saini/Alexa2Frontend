import { useRef } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { RoomMesh } from './RoomMesh';
import { ConnectedWalls } from './ConnectedWalls';
// import { PlacedObjectMesh } from './PlacedObjectMesh';

// Dark plinth the house sits on , keeps the lit interior the hero against deep navy.
function GroundPlane() {
  return (
    <>
      {/* Dark base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0A0D18" roughness={1} metalness={0.0} />
      </mesh>

      {/* Faint tech grid , barely visible, gives a premium "platform" feel */}
      <Grid
        position={[0, -0.03, 0]}
        args={[80, 80]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#10203A"
        sectionSize={8}
        sectionThickness={0.7}
        sectionColor="#16345C"
        fadeDistance={38}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  );
}

export function House() {
  const { ui, rooms, /* placedObjects, */ addPlacedObject, exitPlacementMode, setActiveRoom } = useAppStore();
  const { activeRoomId, isPlacementMode, placementAssetType, hoveredRoomId } = ui;
  const groundRef = useRef<THREE.Mesh>(null);

  const visibleRooms = activeRoomId ? rooms.filter(r => r.id === activeRoomId) : rooms;
  // const visibleObjects = activeRoomId
  //   ? placedObjects.filter(o => o.parentRoomId === activeRoomId)
  //   : placedObjects;

  const isInsideHouse = (x: number, z: number) =>
    rooms.some((room) => {
      const hw = room.width / 2;
      const hd = room.depth / 2;
      return (
        x >= room.position.x - hw &&
        x <= room.position.x + hw &&
        z >= room.position.z - hd &&
        z <= room.position.z + hd
      );
    });

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { x, z } = e.point;

    let targetRoomId: string | null = null;
    for (const room of rooms) {
      const hw = room.width / 2;
      const hd = room.depth / 2;
      if (x >= room.position.x - hw && x <= room.position.x + hw &&
          z >= room.position.z - hd && z <= room.position.z + hd) {
        targetRoomId = room.id;
        break;
      }
    }

    if (isPlacementMode && placementAssetType) {
      addPlacedObject(placementAssetType, { x, y: 0, z }, targetRoomId);
      exitPlacementMode();
      return;
    }

    if (!targetRoomId && activeRoomId) {
      setActiveRoom(null);
    }
  };

  const handleFloorDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isInsideHouse(e.point.x, e.point.z)) {
      setActiveRoom(null);
    }
  };

  return (
    <group>
      {/* Fully transparent floor for placement clicks.
          Must NOT use visible={false} , Three.js skips invisible meshes in raycasting. */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleFloorClick}
        onDoubleClick={handleFloorDoubleClick}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <GroundPlane />

      {/* Connected wall system , shared node graph, no seams */}
      <ConnectedWalls />

      {/* Room floors */}
      {visibleRooms.map(room => (
        <RoomMesh
          key={room.id}
          room={room}
          isActive={activeRoomId === room.id}
          isHovered={hoveredRoomId === room.id}
        />
      ))}

      {/* Placed objects , commented out while static furniture dresses the scene
      {visibleObjects.map(obj => (
        <PlacedObjectMesh key={obj.id} obj={obj} />
      ))} */}
    </group>
  );
}
