import { useEffect, useRef } from 'react';
import { onInteraction } from '../store/interactionEvents';
import { useAppStore } from '../store/store';
import { useTourStore } from '../store/tourStore';
import { playDisco, stopJazz } from '../utils/jazzPlayer';

// Ambient light tint each room's SceneWarmLights point light lerps toward
// while that room is focused. Parallel to store.ts's ROOM_FOCUS_LINES and
// RoomMesh.tsx's FLOOR_PALETTES — same "one entry per room id" shape.
const ROOM_AMBIENT_TINT: Record<string, string> = {
  'living-room': '#FFC98A',
  kitchen: '#FFDDA0',
  'master-bedroom': '#FFCB90',
  bathroom: '#CFE8FF',
  office: '#DCEBFF',
};

const AVATAR_TICKLE_LINES = [
  "Okay, okay, I'm ticklish!",
  "Hey! Careful, that tickles.",
  "Alright, alright, I'm awake!",
];

/**
 * Single subscriber to the interaction-events bus (see interactionEvents.ts).
 * Mounted once at the app root (App.tsx). Producers (room clicks, device
 * clicks, voice commands, avatar clicks) don't need to know what happens
 * next — this hook is the only place that does.
 */
export function useInteractionEffects(): void {
  const stopJazzTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onInteraction((event) => {
      switch (event.type) {
        case 'room:focus': {
          const tint = ROOM_AMBIENT_TINT[event.roomId];
          if (tint) useAppStore.getState().setRoomAmbientTint(tint);
          break;
        }
        case 'room:blur': {
          useAppStore.getState().setRoomAmbientTint(null);
          break;
        }
        case 'vacuum:patrol': {
          useTourStore.getState().setReply('Cleaning up now.');
          break;
        }
        case 'easter-egg:dance-party': {
          useAppStore.getState().setPartyMode(true);
          playDisco();
          if (stopJazzTimeout.current) clearTimeout(stopJazzTimeout.current);
          stopJazzTimeout.current = setTimeout(() => stopJazz(), 8000);
          break;
        }
        case 'easter-egg:avatar-tickle': {
          const line = AVATAR_TICKLE_LINES[Math.floor(Math.random() * AVATAR_TICKLE_LINES.length)];
          useTourStore.getState().setReply(line);
          break;
        }
        case 'object:toggle':
          // No dialogue/lighting reaction needed yet — the click itself
          // (PlacedObjectMesh.tsx) already updates state and shows the
          // confirmation pulse ring. Reserved for future reactions.
          break;
      }
    });
    return () => {
      unsubscribe();
      if (stopJazzTimeout.current) clearTimeout(stopJazzTimeout.current);
    };
  }, []);
}
