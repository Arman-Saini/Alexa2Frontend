import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { House } from './House';
import { RoomFurniture } from './RoomFurniture';
import { EasterEggs } from './EasterEggs';
import { Doors } from './Doors';
import { CameraController } from './CameraController';
import { SmartLights } from './SmartLights';
import { GhostPreview } from './GhostPreview';
import { sharedCameraRef, cameraTransitionRef } from './cameraRef';
import { draggingObjectIdRef } from './dragRef';
import { ScenarioReactor } from './ScenarioReactor';
import { RoomWindows } from './RoomWindows';
import { XRayEffect } from './XRayEffect';
import { DevicePanel } from './DevicePanel';
import { FurnitureInspector } from './FurnitureInspector';
import { SensorTooltip } from './SensorTooltip';
import { DoorInspector } from './DoorInspector';
import { WindowInspector } from './WindowInspector';
import type { AssetType } from '../../types';

// Scenario overrides for SceneLighting , muted when ScenarioReactor takes over
const SCENARIO_LIGHTING: Record<string, {
  sunColor: string; sunInt: number; ambColor: string; ambInt: number; fogColor: string;
}> = {
  grid:  { sunColor: '#200010', sunInt: 0.12, ambColor: '#100010', ambInt: 0.06, fogColor: '#0A0010' },
  pooja: { sunColor: '#FFB020', sunInt: 1.2,  ambColor: '#4A2800', ambInt: 0.22, fogColor: '#2A1800' },
  geyser:{ sunColor: '#FF6020', sunInt: 1.4,  ambColor: '#1A0800', ambInt: 0.20, fogColor: '#1A0A08' },
  jeera: { sunColor: '#FF8010', sunInt: 1.8,  ambColor: '#2A0800', ambInt: 0.18, fogColor: '#1A0800' },
  pressure:{ sunColor: '#C0FFC0', sunInt: 1.2,ambColor: '#081808', ambInt: 0.18, fogColor: '#0A1A0A' },
  away:  { sunColor: '#40C8FF', sunInt: 0.8,  ambColor: '#081020', ambInt: 0.22, fogColor: '#081422' },
};

// Room light positions (approximate 3D positions for each room)
const ROOM_LIGHT_POS: Record<string, [number, number, number]> = {
  kitchen:  [  5,   2,   5],
  bathroom: [ -5,   2,   5],
  living:   [  0,   2,  -5],
  pooja:    [  5,   2,  -5],
  all:      [  0,   3,   0],
};

// Scenario glow colors
const SCENARIO_GLOW: Record<string, { room: string; color: string }> = {
  jeera:    { room: 'kitchen',  color: '#F5A623' },
  pressure: { room: 'kitchen',  color: '#7CC87A' },
  grid:     { room: 'all',      color: '#E07070' },
  pooja:    { room: 'pooja',    color: '#A895F0' },
  geyser:   { room: 'bathroom', color: '#4ECDC4' },
  away:     { room: 'living',   color: '#4ECDC4' },
};

function SceneLighting() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);

  // Default mood: dark, cinematic night , the lit house reads against darkness, matching
  // the reference (image.png). Active scenarios still override via SCENARIO_LIGHTING.
  const baseSunColor = '#9FB4FF';   // cool moonlight key
  const baseSunInt   = 0.75;
  const baseAmbColor = '#10162E';   // deep navy fill
  const baseAmbInt   = 0.24;
  const baseFog      = '#070912';

  const ov = activeScenarioId ? SCENARIO_LIGHTING[activeScenarioId] : null;
  const sunColor = ov?.sunColor ?? baseSunColor;
  const sunInt   = ov?.sunInt   ?? baseSunInt;
  const ambColor = ov?.ambColor ?? baseAmbColor;
  const ambInt   = ov?.ambInt   ?? baseAmbInt;
  const fogColor = ov?.fogColor ?? baseFog;

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 80, 220]} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={sunInt}
        castShadow
        color={sunColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.001}
      />
      <ambientLight intensity={ambInt} color={ambColor} />
    </>
  );
}

function SceneWarmLights() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);

  const glowEntry = activeScenarioId ? SCENARIO_GLOW[activeScenarioId] : null;
  const glowPos = glowEntry ? (ROOM_LIGHT_POS[glowEntry.room] ?? ROOM_LIGHT_POS.all) : null;

  return (
    <>
      {/* Per-room warm ceiling pendants at the new room centres (13×10 plan) , warm pools
          of light so each room reads against the dark mood. */}
      <pointLight position={[ 2.5, 2.85, -2.0]} intensity={2.6} color="#FFD27A" distance={11} decay={2} />{/* living */}
      <pointLight position={[-4.0, 2.85, -2.5]} intensity={2.2} color="#FFB860" distance={9}  decay={2} />{/* bedroom */}
      <pointLight position={[-4.0, 2.85,  1.0]} intensity={1.8} color="#CFE4FF" distance={7}  decay={2} />{/* bathroom */}
      <pointLight position={[-4.0, 2.85,  3.5]} intensity={2.0} color="#DCEBFF" distance={8}  decay={2} />{/* office */}
      <pointLight position={[ 4.0, 2.85,  3.0]} intensity={2.2} color="#FFE6B0" distance={9}  decay={2} />{/* kitchen */}
      <pointLight position={[ 0.0, 2.85,  3.0]} intensity={1.3} color="#FFE0B0" distance={6}  decay={2} />{/* hallway */}
      {glowEntry && glowPos && (
        <pointLight
          key={activeScenarioId ?? ''}
          position={glowPos}
          intensity={1.4}
          color={glowEntry.color}
          distance={6}
        />
      )}
    </>
  );
}

export function DigitalTwinCanvas() {
  const {
    ui, rooms, placedObjects,
    setActiveRoom, setSelectedObject, exitPlacementMode,
    addPlacedObject, enterPlacementMode, setDraggedAsset,
    updatePlacedObject,
    selectedDoorId, setSelectedDoor, selectedWindowId, setSelectedWindow,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ui.isPlacementMode) exitPlacementMode();
        else if (ui.selectedObjectId) setSelectedObject(null);
        else if (ui.activeRoomId) setActiveRoom(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ui, setActiveRoom, setSelectedObject, exitPlacementMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dragId = draggingObjectIdRef.current;
    if (!dragId || !ui.isLayoutEditMode) return;

    const camera = sharedCameraRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!camera || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const xNdc = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const yNdc = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(xNdc, yNdc), camera);
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
      updatePlacedObject(dragId, { position: { x: hitPoint.x, y: 0, z: hitPoint.z } });
    }
  }, [ui.isLayoutEditMode, updatePlacedObject]);

  const handleMouseUp = useCallback(() => {
    if (draggingObjectIdRef.current) {
      draggingObjectIdRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = 'default';
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    setTimeout(() => {
      if (draggingObjectIdRef.current) setIsDragging(true);
    }, 0);
  }, []);

  // Drag-and-drop from the asset library panel
  const handleDragOver = useCallback((e: React.DragEvent) => {
    const type = e.dataTransfer.getData('assetType') || e.dataTransfer.types.includes('assettype') ? e.dataTransfer.getData('assetType') || e.dataTransfer.getData('assettype') : null;
    if (type || ui.draggedAssetType) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [ui.draggedAssetType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = (e.dataTransfer.getData('assetType') || e.dataTransfer.getData('assettype')) as AssetType | '';
    if (!type) return;

    const camera = sharedCameraRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!camera || !wrapper) {
      // Fallback: enter placement mode and let user click to place
      enterPlacementMode(type as AssetType);
      return;
    }

    // Project drop position to 3D floor (y=0 plane) via raycasting
    const rect = wrapper.getBoundingClientRect();
    const xNdc = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const yNdc = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(xNdc, yNdc), camera);
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(floorPlane, hitPoint);

    if (!hit) {
      enterPlacementMode(type as AssetType);
      return;
    }

    // Find which room the drop falls in
    let roomId: string | null = null;
    for (const room of rooms) {
      const hw = room.width / 2;
      const hd = room.depth / 2;
      if (
        hitPoint.x >= room.position.x - hw && hitPoint.x <= room.position.x + hw &&
        hitPoint.z >= room.position.z - hd && hitPoint.z <= room.position.z + hd
      ) {
        roomId = room.id;
        break;
      }
    }

    addPlacedObject(type as AssetType, { x: hitPoint.x, y: 0, z: hitPoint.z }, roomId);
    setDraggedAsset(null);
  }, [rooms, addPlacedObject, enterPlacementMode, setDraggedAsset]);

  const isEditMode = ui.isLayoutEditMode && !ui.layoutLocked;
  const cursorClass = ui.isPlacementMode
    ? 'cursor-crosshair'
    : isEditMode
    ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
    : '';

  return (
    <div
      ref={canvasWrapperRef}
      className={`w-full h-full relative ${cursorClass}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        orthographic
        shadows
        camera={{ position: [15, 13.5, 15], zoom: 40, near: -500, far: 500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        style={{ background: '#070912' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <ScenarioReactor />
          <Environment files="/hdri/interior_2k.hdr" background={false} environmentIntensity={0.28} />
          <ContactShadows position={[0, 0.01, 0]} opacity={0.8} scale={50} blur={1.6} far={6} color="#000008" />
          <SmartLights />
          <GhostPreview />
          <XRayEffect />
          <CameraController />
          {/* 3/4 isometric with orbit ENABLED (per design spec §3): mouse drag / touch to
              orbit, scroll to zoom; room focus is driven by CameraController choreography. */}
          <OrbitControls
            makeDefault
            enabled={!ui.isPlacementMode && !isDragging}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
            minZoom={22}
            maxZoom={130}
            maxPolarAngle={Math.PI / 2.15}
            minPolarAngle={Math.PI / 5}
            minDistance={5}
            maxDistance={80}
            panSpeed={0.6}
            rotateSpeed={0.4}
            zoomSpeed={0.9}
            onStart={() => { cameraTransitionRef.current = false; }}
          />
          <House />
          <RoomFurniture />
          <RoomWindows />
          <Doors />
          <SceneWarmLights />
          <EasterEggs />

          {/* Cinematic post-processing , SSAO grounds furniture in corners (archviz depth),
              bloom drives the warm light glow, vignette frames the scene. */}
          <EffectComposer enableNormalPass>
            <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={1} halfRes />
            <Bloom
              intensity={0.85}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
            <Vignette offset={0.25} darkness={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Act/UI chrome overlays mount here — added by later tickets (ActShell, inspectors) */}
      {(() => {
        const selectedObj = ui.selectedObjectId
          ? placedObjects.find((o) => o.id === ui.selectedObjectId)
          : undefined;

        if (selectedObj) {
          return selectedObj.isAlexaDevice ? (
            <DevicePanel obj={selectedObj} onClose={() => setSelectedObject(null)} />
          ) : (
            <FurnitureInspector obj={selectedObj} onClose={() => setSelectedObject(null)} />
          );
        }
        if (selectedDoorId) {
          return <DoorInspector doorId={selectedDoorId} onClose={() => setSelectedDoor(null)} />;
        }
        if (selectedWindowId) {
          return <WindowInspector windowId={selectedWindowId} onClose={() => setSelectedWindow(null)} />;
        }
        return null;
      })()}
      {ui.hoveredObjectId && ui.hoveredObjectId !== ui.selectedObjectId && (() => {
        const hoveredObj = placedObjects.find((o) => o.id === ui.hoveredObjectId);
        return hoveredObj ? <SensorTooltip obj={hoveredObj} /> : null;
      })()}
    </div>
  );
}
