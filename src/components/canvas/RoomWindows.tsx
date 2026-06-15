import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import _layoutInit from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { useAppStore } from '../../store/store';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

type WindowModel = 'WindowRound' | 'WindowLarge' | 'WindowSmall';
type WindowEntry = { id: string; wx: number; wz: number; rotY: number; model: WindowModel };

const WALL_ROT_Y: Record<string, number> = { W1: 0, W2: Math.PI / 2, W3: Math.PI, W4: Math.PI / 2 };

function useWindowEntries(): WindowEntry[] {
  const windowOverrides = useAppStore(s => s.windowOverrides);
  return useMemo(() => {
    const result: WindowEntry[] = [];
    for (const [roomId, roomDef] of Object.entries(_layoutInit.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      const rd = roomDef as {
        windows?: Array<{ id: string; anchor: { wall: string; along: number }; model?: string }>;
      };
      for (const win of rd.windows ?? []) {
        const ov = windowOverrides[win.id] ?? {};
        const along = ov.along ?? win.anchor.along;
        const { wall } = win.anchor;
        const { xMin, xMax, zMin, zMax } = bounds;
        let wx = 0, wz = 0;
        if (wall === 'W1') { wx = lerp(xMin, xMax, along); wz = zMin; }
        else if (wall === 'W2') { wx = xMax; wz = lerp(zMin, zMax, along); }
        else if (wall === 'W3') { wx = lerp(xMin, xMax, along); wz = zMax; }
        else { wx = xMin; wz = lerp(zMin, zMax, along); }
        const isExterior = Math.abs(wx + 13) < 0.3 || Math.abs(wx - 13) < 0.3 || Math.abs(wz + 10) < 0.3 || Math.abs(wz - 10) < 0.3;
        if (!isExterior) continue;
        const model = (win.model as WindowModel | undefined) ?? 'WindowRound';
        result.push({ id: win.id, wx, wz, rotY: WALL_ROT_Y[wall] ?? 0, model });
      }
    }
    return result;
  }, [windowOverrides]);
}

// Scale targets per model type (metres for the dominant dimension)
const MODEL_TARGET: Record<WindowModel, number> = {
  WindowLarge: 1.5,
  WindowSmall: 0.9,
  WindowRound: 1.1,
};

function WindowModelMesh({ id, wx, wz, rotY, model }: WindowEntry) {
  const url = `/models/quaternius/${model}.glb`;
  const { scene } = useGLTF(url);
  const selectedWindowId = useAppStore(s => s.selectedWindowId);
  const isLayoutEditMode = useAppStore(s => s.ui.isLayoutEditMode);
  const layoutLocked = useAppStore(s => s.ui.layoutLocked);
  const setSelectedWindow = useAppStore(s => s.setSelectedWindow);

  const target = MODEL_TARGET[model] ?? 1.2;

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) c.scale.setScalar(target / maxDim);
    const box2 = new THREE.Box3().setFromObject(c);
    c.position.y -= box2.min.y;
    return c;
  }, [scene, target]);

  const isSelected = selectedWindowId === id;
  const clickable = isLayoutEditMode && !layoutLocked;

  return (
    <group
      position={[wx, 0.85, wz]}
      rotation={[0, rotY, 0]}
      onClick={clickable ? (e) => { e.stopPropagation(); setSelectedWindow(id); } : undefined}
    >
      <primitive object={cloned} />
      {isSelected && (
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.05, 8, 32]} />
          <meshBasicMaterial color="#00BFFF" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function RoomWindows() {
  const entries = useWindowEntries();
  return (
    <Suspense fallback={null}>
      {entries.map((w) => (
        <WindowModelMesh key={w.id} {...w} />
      ))}
    </Suspense>
  );
}

// Preload all three window assets
useGLTF.preload('/models/quaternius/WindowLarge.glb');
useGLTF.preload('/models/quaternius/WindowSmall.glb');
useGLTF.preload('/models/quaternius/WindowRound.glb');
