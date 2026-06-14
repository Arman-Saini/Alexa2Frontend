import { useRef, Suspense } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { RoomMesh } from './RoomMesh';
import { PlacedObjectMesh } from './PlacedObjectMesh';
import { HouseModel } from './HouseModel';

function GroundPlane() {
  return (
    <>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0d14" roughness={1} />
      </mesh>
      {/* Subtle grid */}
      <Grid
        position={[0, -0.03, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.2}
        cellColor="#12192a"
        sectionSize={5}
        sectionThickness={0.6}
        sectionColor="#1a2540"
        fadeDistance={35}
        fadeStrength={1.5}
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
      const hw = room.width / 2;
      const hd = room.depth / 2;
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
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial />
      </mesh>

      <GroundPlane />

      {/* The actual house OBJ exterior (loaded from public/models/house.obj) */}
      {!activeRoomId && (
        <Suspense fallback={null}>
          <HouseModel />
        </Suspense>
      )}

      {/* Procedural rooms (dollhouse interior) */}
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
