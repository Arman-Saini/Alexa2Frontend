// Minimal scenario -> room-glow-color mapping consumed by canvas/ScenarioReactor.tsx.
// Replaces the old components/demo/ScenarioDefs.ts SCENARIOS export (deleted with the old UI chrome) —
// only the 3 fields ScenarioReactor.tsx actually reads (id, roomGlow, glowColor), recolored to the
// void/copper/ember palette instead of the old Salt & Pepper C.* colors.

export type RoomTarget = 'kitchen' | 'bathroom' | 'living' | 'pooja' | 'office' | 'all';

interface ScenarioGlow {
  id: string;
  roomGlow: RoomTarget;
  glowColor: string;
}

const EMBER = '#D99A44';   // warm/active (cooking, chai)
const ALERT = '#C0665A';   // muted rose (safety alerts: grid, geyser, milk overflow)
const CALM = '#8FA688';    // muted sage (resolved/safe: pressure release)
const NIGHT = '#9B86B0';   // muted violet (pooja, night checks)
const AWAY_TEAL = '#5FA8A0'; // muted teal (away/guest presence)

export const SCENARIOS: ScenarioGlow[] = [
  { id: 'jeera',           roomGlow: 'kitchen', glowColor: EMBER },
  { id: 'pressure',        roomGlow: 'kitchen', glowColor: CALM },
  { id: 'grid',            roomGlow: 'all',     glowColor: ALERT },
  { id: 'pooja',           roomGlow: 'pooja',   glowColor: NIGHT },
  { id: 'geyser',          roomGlow: 'bathroom',glowColor: ALERT },
  { id: 'away',            roomGlow: 'living',  glowColor: AWAY_TEAL },
  { id: 'chai',            roomGlow: 'kitchen', glowColor: EMBER },
  { id: 'milk_overflow',   roomGlow: 'kitchen', glowColor: ALERT },
  { id: 'guest_doorbell',  roomGlow: 'living',  glowColor: AWAY_TEAL },
  { id: 'son_study',       roomGlow: 'office',  glowColor: AWAY_TEAL },
  { id: 'night_check',     roomGlow: 'all',     glowColor: NIGHT },
];
