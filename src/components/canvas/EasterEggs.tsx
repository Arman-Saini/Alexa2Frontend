import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { useBrunoStore } from '../../store/brunoStore';
import { useActStore } from '../../store/actStore';

const BRUNO_ALEXA_REPLY = 'Based on Bruno’s past feeding time, it seems like he’s hungry. Should I turn on the automatic treat dispenser?';

// Delightful, non-interactive easter eggs hidden in the home , they reward the judge
// for exploring and make the twin feel alive. Nothing here is an Alexa device; these
// never affect commands or state.

// Voxel/"pixelated" cube helper , flat-shaded blocks read as Minecraft-style pixel art.
function Vox({
  pos, size, color, rough = 0.8,
}: { pos: [number, number, number]; size: [number, number, number]; color: string; rough?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={0} flatShading />
    </mesh>
  );
}

// ── Pixelated German Shepherd , sits near the sofa, "watching TV" ──────────────
export function PixelDog() {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // gentle breathing
    if (group.current) group.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    // happy tail wag
    if (tail.current) tail.current.rotation.y = Math.sin(t * 6) * 0.5;
    // occasional curious head tilt
    if (head.current) head.current.rotation.z = Math.sin(t * 0.7) * 0.08;
  });

  const TAN = '#C8923C';
  const DARK = '#2A2018';   // black saddle / ears / snout
  const LIGHT = '#E8C078';  // chest/paws highlight

  return (
    <group ref={group} scale={0.62}>
      {/* hind legs (tucked, sitting) */}
      <Vox pos={[-0.18, 0.12, 0.28]} size={[0.22, 0.24, 0.3]} color={TAN} />
      <Vox pos={[0.18, 0.12, 0.28]} size={[0.22, 0.24, 0.3]} color={TAN} />
      {/* body, leaning back as it sits */}
      <group rotation={[0.25, 0, 0]}>
        <Vox pos={[0, 0.5, 0.1]} size={[0.46, 0.62, 0.5]} color={TAN} />
        {/* dark saddle on the back */}
        <Vox pos={[0, 0.74, 0.12]} size={[0.48, 0.18, 0.4]} color={DARK} />
        {/* chest */}
        <Vox pos={[0, 0.42, -0.18]} size={[0.4, 0.42, 0.18]} color={LIGHT} />
      </group>
      {/* front legs (straight) */}
      <Vox pos={[-0.14, 0.2, -0.22]} size={[0.16, 0.42, 0.18]} color={TAN} />
      <Vox pos={[0.14, 0.2, -0.22]} size={[0.16, 0.42, 0.18]} color={TAN} />
      <Vox pos={[-0.14, 0.02, -0.28]} size={[0.18, 0.1, 0.26]} color={LIGHT} />
      <Vox pos={[0.14, 0.02, -0.28]} size={[0.18, 0.1, 0.26]} color={LIGHT} />
      {/* head */}
      <group ref={head} position={[0, 0.96, -0.18]}>
        <Vox pos={[0, 0, 0]} size={[0.34, 0.34, 0.34]} color={TAN} />
        {/* snout */}
        <Vox pos={[0, -0.06, -0.22]} size={[0.18, 0.16, 0.18]} color={DARK} />
        <Vox pos={[0, -0.04, -0.32]} size={[0.1, 0.08, 0.06]} color="#111" />
        {/* erect ears (the German Shepherd signature) */}
        <Vox pos={[-0.12, 0.26, 0.02]} size={[0.1, 0.22, 0.06]} color={DARK} />
        <Vox pos={[0.12, 0.26, 0.02]} size={[0.1, 0.22, 0.06]} color={DARK} />
        {/* eyes */}
        <Vox pos={[-0.09, 0.04, -0.18]} size={[0.05, 0.05, 0.04]} color="#0A0A0A" />
        <Vox pos={[0.09, 0.04, -0.18]} size={[0.05, 0.05, 0.04]} color="#0A0A0A" />
      </group>
      {/* bushy tail */}
      <group ref={tail} position={[0, 0.4, 0.34]}>
        <Vox pos={[0, 0.1, 0.12]} size={[0.14, 0.3, 0.16]} color={DARK} />
      </group>
    </group>
  );
}

function BrunoMoment() {
  const currentAct = useActStore((s) => s.currentAct);
  const phase = useBrunoStore((s) => s.phase);
  const openConversation = useBrunoStore((s) => s.openConversation);
  const dismiss = useBrunoStore((s) => s.dismiss);
  const [typedReply, setTypedReply] = useState('');
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    if (phase !== 'conversation') {
      setTypedReply('');
      setDecision(null);
      return;
    }

    let characterIndex = 0;
    let typing: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      typing = setInterval(() => {
        characterIndex += 1;
        setTypedReply(BRUNO_ALEXA_REPLY.slice(0, characterIndex));
        if (characterIndex >= BRUNO_ALEXA_REPLY.length && typing) clearInterval(typing);
      }, 18);
    }, 350);

    return () => {
      clearTimeout(start);
      if (typing) clearInterval(typing);
    };
  }, [phase]);

  const beginConversation = () => {
    // One interaction: remove demo chrome, focus Bruno, then begin the chat.
    useActStore.getState().goToAct('freeplay');
    useActStore.getState().closeLens();
    useAppStore.getState().setActiveRoom('living-room');
    openConversation();
  };

  const answer = (choice: 'yes' | 'no') => {
    setDecision(choice);
    if (choice === 'yes') useAppStore.getState().setDogFed(true);
  };

  return (
    // Same resolved anchor as `lr-dog` in anchorLayout.json. This adds UI only;
    // Bruno's existing PixelDog remains owned and rendered by RoomFurniture.
    <group position={[0.44, 0, -4.5]}>
      {phase === 'idle' && currentAct === 'freeplay' && (
        <Html position={[0, 1.7, 0]} center zIndexRange={[30, 0]}>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              beginConversation();
            }}
            className="group relative whitespace-nowrap rounded-[20px] border border-[#d99a44]/55 bg-[#21170f]/95 px-5 py-3 font-mono text-lg font-bold tracking-wide text-[#f0dac9] shadow-[0_10px_26px_rgba(0,0,0,0.5),0_0_22px_rgba(217,154,68,0.24)] transition-all hover:scale-105 hover:bg-[#302015]"
          >
            <span className="mr-2 text-[#d99a44]">⌁</span>
            WOOF! WOOF!
            <span className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 border-b border-r border-[#d99a44]/55 bg-[#21170f]" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono font-normal tracking-[0.12em] text-[#e8b368]/80 opacity-0 transition-opacity group-hover:opacity-100">CLICK TO OPEN CHAT</span>
          </button>
        </Html>
      )}

      {phase === 'conversation' && (
        <Html position={[0, 2.45, 0]} center zIndexRange={[30, 0]}>
          <div
            className="w-[min(460px,calc(100vw-48px))] overflow-hidden rounded-[26px] border border-[#c08662]/40 bg-[#121110]/95 shadow-[0_18px_54px_rgba(0,0,0,0.65),0_0_34px_rgba(192,134,98,0.18)]"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d99a44]/30 bg-[#2a1e14] text-lg">🐶</span>
                <div>
                  <p className="text-sm font-semibold text-[#f2ede6]">Bruno</p>
                  <p className="text-[9px] font-mono tracking-[0.14em] text-[#d99a44]">LIVING ROOM · ACTIVE</p>
                </div>
              </div>
              <button type="button" onClick={dismiss} aria-label="Close Bruno conversation" className="rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-end gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rounded-bl-sm bg-[#2a1e14] text-xl">🐶</span>
                <div className="rounded-2xl rounded-bl-sm border border-[#d99a44]/20 bg-[#211b16] px-4 py-3 text-[17px] leading-relaxed text-[#f2ede6]">
                  Woof woof!
                </div>
              </div>
              <div className="ml-auto flex w-full items-end justify-end gap-2.5">
                <div className="min-h-[132px] flex-1 rounded-2xl rounded-br-sm border border-[#00caff]/25 bg-[#10242d] px-4 py-3 text-left text-[17px] leading-relaxed text-[#f2ede6]">
                  {typedReply}
                  {typedReply.length < BRUNO_ALEXA_REPLY.length && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-[#8edfff]" />}
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rounded-br-sm border border-[#00caff]/30 bg-[#0c222d] text-base text-[#8edfff]">◉</span>
              </div>
            </div>
            {typedReply.length === BRUNO_ALEXA_REPLY.length && (
              <div className="border-t border-white/[0.07] px-4 py-3">
                {decision === null ? (
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => answer('no')} className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[11px] font-mono text-white/60 transition-colors hover:bg-white/[0.06]">NO, NOT NOW</button>
                    <button type="button" onClick={() => answer('yes')} className="rounded-full border border-[#c08662]/45 bg-[#c08662]/15 px-3 py-1.5 text-[11px] font-mono font-bold text-[#f0dac9] transition-colors hover:bg-[#c08662]/28">YES, DISPENSE</button>
                  </div>
                ) : (
                  <p className="text-right text-[12px] font-mono text-[#e8b368]">
                    {decision === 'yes' ? 'Treat dispenser on. Bruno’s snack is on the way.' : 'Okay. I’ll wait for Bruno’s next cue.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function LaundryDoorbellBubble() {
  const currentAct = useActStore((s) => s.currentAct);
  if (currentAct !== 'freeplay') return null;

  return (
    <group position={[0, 0, 11.15]}>
      {/* Vendor waits outside `hw-door` (hallway W3 / exterior south wall). */}
      <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 1.75, 0]} castShadow><sphereGeometry args={[0.19, 24, 18]} /><meshStandardMaterial color="#A86F4C" roughness={0.88} /></mesh>
        <mesh position={[0, 1.63, 0]}><cylinderGeometry args={[0.08, 0.08, 0.16, 12]} /><meshStandardMaterial color="#8D593D" roughness={0.9} /></mesh>
        <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.31, 0.26, 0.86, 12]} /><meshStandardMaterial color="#426C8B" roughness={0.88} /></mesh>
        <mesh position={[-0.34, 1.22, 0]} rotation={[0, 0, 0.22]} castShadow><cylinderGeometry args={[0.075, 0.09, 0.7, 10]} /><meshStandardMaterial color="#A86F4C" roughness={0.88} /></mesh>
        <mesh position={[0.34, 1.22, 0]} rotation={[0, 0, -0.22]} castShadow><cylinderGeometry args={[0.075, 0.09, 0.7, 10]} /><meshStandardMaterial color="#A86F4C" roughness={0.88} /></mesh>
        <mesh position={[-0.13, 0.44, 0]} castShadow><cylinderGeometry args={[0.105, 0.12, 0.72, 10]} /><meshStandardMaterial color="#2B2C30" roughness={0.95} /></mesh>
        <mesh position={[0.13, 0.44, 0]} castShadow><cylinderGeometry args={[0.105, 0.12, 0.72, 10]} /><meshStandardMaterial color="#2B2C30" roughness={0.95} /></mesh>
        <mesh position={[-0.13, 0.08, -0.07]} castShadow><boxGeometry args={[0.18, 0.1, 0.3]} /><meshStandardMaterial color="#181818" roughness={0.9} /></mesh>
        <mesh position={[0.13, 0.08, -0.07]} castShadow><boxGeometry args={[0.18, 0.1, 0.3]} /><meshStandardMaterial color="#181818" roughness={0.9} /></mesh>
        <mesh position={[0.44, 0.62, 0.08]} rotation={[0, 0, -0.2]} castShadow><boxGeometry args={[0.42, 0.52, 0.22]} /><meshStandardMaterial color="#C8923C" roughness={0.9} /></mesh>
      </group>
      <Html position={[0, 2.3, 0]} center zIndexRange={[30, 0]}>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            window.dispatchEvent(new Event('hearth:laundry-doorbell'));
          }}
          className="group relative whitespace-nowrap rounded-[20px] border border-[#00caff]/45 bg-[#10242d]/95 px-4 py-2.5 font-mono text-sm font-bold tracking-wide text-[#ccefff] shadow-[0_10px_26px_rgba(0,0,0,0.5),0_0_22px_rgba(0,202,255,0.18)] transition-all hover:scale-105 hover:bg-[#14303c]"
        >
          <span className="mr-2 text-base">🔔</span> RING RANG
          <span className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-[#00caff]/45 bg-[#10242d]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono font-normal tracking-[0.12em] text-[#8edfff]/80 opacity-0 transition-opacity group-hover:opacity-100">OPEN VISITOR MOMENT</span>
        </button>
      </Html>
    </group>
  );
}

function FinanceBubble() {
  const currentAct = useActStore((s) => s.currentAct);
  if (currentAct !== 'freeplay') return null;
  return <group position={[8, 0, 5]}><Html position={[0, 1.5, 0]} center zIndexRange={[30, 0]}><button type="button" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); window.dispatchEvent(new Event('hearth:finance-summary')); }} className="group relative whitespace-nowrap rounded-[20px] border border-[#d99a44]/50 bg-[#21170f]/95 px-4 py-2.5 font-mono text-sm font-bold tracking-wide text-[#f0dac9] shadow-[0_10px_26px_rgba(0,0,0,.5)] transition-all hover:scale-105 hover:bg-[#302015]"><span className="mr-2 text-base">₹</span>BILLS DUE<span className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-[#d99a44]/50 bg-[#21170f]" /><span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono font-normal tracking-[.12em] text-[#e8b368]/80 opacity-0 transition-opacity group-hover:opacity-100">VIEW MONEY SNAPSHOT</span></button></Html></group>;
}

// ── Robot vacuum , slowly patrols the living-room floor ───────────────────────
function RobotVacuum() {
  const ref = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const vacuumOn = useAppStore((s) => s.vacuumOn);

  // Boustrophedon (lawn-mower) sweep across living room x[-3,13] z[-10,2]
  const path = [
    new THREE.Vector3(-1.5, 0, -9),
    new THREE.Vector3(11.5, 0, -9),
    new THREE.Vector3(11.5, 0, -7),
    new THREE.Vector3(-1.5, 0, -7),
    new THREE.Vector3(-1.5, 0, -5),
    new THREE.Vector3(11.5, 0, -5),
    new THREE.Vector3(11.5, 0, -3),
    new THREE.Vector3(-1.5, 0, -3),
    new THREE.Vector3(-1.5, 0, -1),
    new THREE.Vector3(11.5, 0, -1),
    new THREE.Vector3(11.5, 0, -9), // loop back
  ];

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (vacuumOn) {
      timeRef.current += delta;
    }
    const t = (timeRef.current * 0.025) % 1;
    const seg = t * path.length;
    const i = Math.floor(seg);
    const f = seg - i;
    const a = path[i];
    const b = path[(i + 1) % path.length];
    ref.current.position.lerpVectors(a, b, f);
    ref.current.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 24]} />
        <meshStandardMaterial color="#1A1D24" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* status light */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial
          color={vacuumOn ? "#00C8FF" : "#FF3B30"}
          emissive={vacuumOn ? "#00C8FF" : "#FF3B30"}
          emissiveIntensity={vacuumOn ? 2 : 0.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ── Sleeping cat (loaf) , curled up on the bed ────────────────────────────────
export function SleepingCat() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 1.6) * 0.03; // breathing
  });
  const GREY = '#6E6A66';
  const DARKGREY = '#4A4744';
  return (
    <group ref={ref} scale={0.5} rotation={[0, 0.6, 0]}>
      {/* loaf body */}
      <Vox pos={[0, 0.16, 0]} size={[0.5, 0.3, 0.36]} color={GREY} />
      {/* head */}
      <Vox pos={[0.28, 0.22, 0.04]} size={[0.22, 0.22, 0.24]} color={GREY} />
      {/* ears */}
      <Vox pos={[0.22, 0.38, -0.06]} size={[0.07, 0.1, 0.06]} color={DARKGREY} />
      <Vox pos={[0.22, 0.38, 0.12]} size={[0.07, 0.1, 0.06]} color={DARKGREY} />
      {/* tail curled around */}
      <Vox pos={[-0.24, 0.12, 0.16]} size={[0.34, 0.12, 0.12]} color={DARKGREY} />
    </group>
  );
}

// Hide an egg when the user has zoomed into a *different* room.
function RoomGated({ room, children, ...pos }: { room: string; children: React.ReactNode; position: [number, number, number] }) {
  const activeRoomId = useAppStore((s) => s.ui.activeRoomId);
  if (activeRoomId && activeRoomId !== room) return null;
  return <group position={pos.position}>{children}</group>;
}

export function EasterEggs() {
  return (
    <>
      {/* Robot vacuum patrolling the living room */}
      <RoomGated room="living-room" position={[0, 0, 0]}>
        <RobotVacuum />
      </RoomGated>
      <RoomGated room="living-room" position={[0, 0, 0]}>
        <BrunoMoment />
      </RoomGated>
      <LaundryDoorbellBubble />
      <FinanceBubble />
    </>
  );
}
