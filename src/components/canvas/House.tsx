import { useRef } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { RoomMesh } from './RoomMesh';
import { PlacedObjectMesh } from './PlacedObjectMesh';
import { ConnectedWalls } from './ConnectedWalls';
import { TOON_GRADIENT } from './ToonMaterial';

// Sims-style grass ground outside the house footprint
function GroundPlane() {
  return (
    <>
      {/* Grass base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshToonMaterial color="#5A8040" gradientMap={TOON_GRADIENT} />
      </mesh>

      {/* Subtle garden grid — shows outside the house */}
      <Grid
        position={[0, -0.03, 0]}
        args={[80, 80]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#4A7030"
        sectionSize={8}
        sectionThickness={0.8}
        sectionColor="#3A6020"
        fadeDistance={40}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  );
}

export function House() {
  const { ui, rooms, placedObjects, addPlacedObject, exitPlacementMode } = useAppStore();
  const { activeRoomId, isPlacementMode, placementAssetType, hoveredRoomId } = ui;
  const groundRef = useRef<THREE.Mesh>(null);

  const visibleRooms = activeRoomId ? rooms.filter(r => r.id === activeRoomId) : rooms;
  const visibleObjects = activeRoomId
    ? placedObjects.filter(o => o.parentRoomId === activeRoomId)
    : placedObjects;

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isPlacementMode || !placementAssetType) return;
    e.stopPropagation();
    const point = e.point;
    let targetRoomId: string | null = null;
    for (const room of rooms) {
      const hw = room.width  / 2;
      const hd = room.depth  / 2;
      if (
        point.x >= room.position.x - hw &&
        point.x <= room.position.x + hw &&
        point.z >= room.position.z - hd &&
        point.z <= room.position.z + hd
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
      {/* Invisible floor for placement clicks */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleFloorClick}
        visible={false}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial />
      </mesh>

      <GroundPlane />

      {/* Connected wall system — shared node graph, no seams */}
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

      {/* Placed objects */}
      {visibleObjects.map(obj => (
        <PlacedObjectMesh key={obj.id} obj={obj} />
      ))}
    </group>
  );
}
