// Single source of truth for scenario definitions, design tokens, and shared types.
// Import from this file only , no other component should hard-code colors or scenario data.

import { backendApi } from '../../api';

// ── Design tokens ─────────────────────────────────────────────────────────────

export const C = {
  // Salt & Pepper
  bg:        '#111111',
  surface:   '#1A1A1A',
  card:      '#242424',
  card2:     '#333333',
  border:    '#404040',
  border2:   '#505050',

  text:      '#F0F0EE',
  text2:     '#CCCCCA',
  text3:     '#888888',

  gold:      '#E8E8E6',   // salt as accent
  goldDim:   '#383838',
  goldBg:    '#202020',
  goldGlow:  'rgba(240,240,238,0.10)',

  cyan:      '#7ABCCC',
  cyanDim:   '#182428',
  cyanBg:    '#0E1618',

  green:     '#6AAA72',
  greenDim:  '#182018',
  greenBg:   '#0E1410',

  amber:     '#C09050',
  amberDim:  '#302010',
  amberBg:   '#1C1208',

  red:       '#C06060',
  redDim:    '#301818',
  redBg:     '#1C0E0E',

  violet:    '#8880A8',
  violetDim: '#201E30',
  violetBg:  '#14121E',
} as const;

export const F = {
  badge:  11,
  tiny:   12,
  xs:     13,
  sm:     14,
  base:   15,
  md:     16,
  lg:     20,
  xl:     24,
  hero:   32,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type TierKey = 'T0' | 'T1' | 'T2' | 'T3';
export type IntelTab = 'cascade' | 'memory' | 'agents' | 'kb';
export type PersonaKey = 'dadi' | 'parent' | 'child';
export type RoomTarget = 'kitchen' | 'bathroom' | 'living' | 'pooja' | 'office' | 'all' | null;

export interface WaveformProfile {
  baseAmplitude: number;   // 0–1 idle height fraction
  spikeFrequency: number;  // average spikes per second (0 = none)
  spikeAmplitude: number;  // 0–1
  spikeColor: string;      // hex
  baseColor: string;       // hex for non-spike bars
  label: string;
  eventTag?: string;
}

export interface CartItem {
  name: string;
  priceINR: string;
  badge: 'AUTO-ADDED' | 'SUGGESTED';
  badgeColor: 'amber' | 'cyan';
  triggerScenario: string;
}

export interface AlertCardDef {
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  text: string;
  primaryAction: string;
  actionType: 'none' | 'timer' | 'branch' | 'ltm' | 'api';
}

export interface ActiveScenario {
  id: string;
  tier: TierKey;
  roomGlow: RoomTarget;
  roomState: string;
  glowColor: string;
  waveformProfile: WaveformProfile;
  alertCard: AlertCardDef;
  cartItems?: CartItem[];
  intelTab: IntelTab;
  ms: string;
  cost: string;
  badgeLabel: string;
  title: string;
  subDesc: string;
  narration: string;   // spoken by TTS when scenario fires
  apiFn: () => Promise<unknown>;
  humanTitle: string;       // non-tech description, shown on scenario card
  humanTier: string;        // e.g. "runs on device" | "learned" | "asked the cloud once"
  roomName: string;         // e.g. "Kitchen"
  modelExplainer: string;   // AI model explanation shown in ColA
  walkthroughSteps?: string[];
  alexaMessage: {           // persona-specific Alexa responses
    dadi: string;
    parent: string;
    child: string;
  };
}

export interface SensorReading {
  name: string;
  value: number;   // 0–100
  unit: string;
  color: string;
  statusLabel?: string;
}

// ── Waveform profiles ─────────────────────────────────────────────────────────

export const IDLE_WAVEFORM: WaveformProfile = {
  baseAmplitude: 0.28,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.cyan,
  baseColor: C.cyan,
  label: 'Idle , listening',
};

const JEERA_PROFILE: WaveformProfile = {
  baseAmplitude: 0.45,
  spikeFrequency: 4,
  spikeAmplitude: 0.9,
  spikeColor: C.red,
  baseColor: C.amber,
  label: '20Hz – 8kHz',
  eventTag: 'Jeera spike · 800Hz',
};

const PRESSURE_PROFILE: WaveformProfile = {
  baseAmplitude: 0.25,
  spikeFrequency: 0.5,
  spikeAmplitude: 1.0,
  spikeColor: C.green,
  baseColor: C.green,
  label: '1kHz – 4kHz',
  eventTag: 'Whistle transient detected',
};

const GRID_PROFILE: WaveformProfile = {
  baseAmplitude: 0.08,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.red,
  baseColor: C.red,
  label: 'Flatline , grid lost',
  eventTag: 'Power cut detected',
};

const POOJA_PROFILE: WaveformProfile = {
  baseAmplitude: 0.35,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.violet,
  baseColor: C.violet,
  label: 'Ambient , devotional',
  eventTag: 'Regime shift: RESTING_STATE',
};

const GEYSER_PROFILE: WaveformProfile = {
  baseAmplitude: 0.22,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.red,
  baseColor: C.cyan,
  label: 'Low hum , anomaly',
  eventTag: 'Geyser on 45min > 20min avg',
};

const AWAY_PROFILE: WaveformProfile = {
  baseAmplitude: 0.18,
  spikeFrequency: 0.8,
  spikeAmplitude: 0.5,
  spikeColor: C.cyan,
  baseColor: C.text3,
  label: 'Radar pulse , presence',
  eventTag: 'BLE geofence exit + pet signature',
};

const CHAI_PROFILE: WaveformProfile = {
  baseAmplitude: 0.30,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.amber,
  baseColor: C.amber,
  label: 'Low simmer , chai timer',
  eventTag: 'Stove timer: 8 min remaining',
};

const MILK_PROFILE: WaveformProfile = {
  baseAmplitude: 0.55,
  spikeFrequency: 3,
  spikeAmplitude: 0.75,
  spikeColor: C.red,
  baseColor: C.amber,
  label: '80–500Hz bubble surge',
  eventTag: 'Milk boil-over imminent',
};

const GUEST_PROFILE: WaveformProfile = {
  baseAmplitude: 0.4,
  spikeFrequency: 1,
  spikeAmplitude: 0.6,
  spikeColor: C.cyan,
  baseColor: C.green,
  label: 'Doorbell transient',
  eventTag: 'Guest doorbell detected',
};

const NIGHT_PROFILE: WaveformProfile = {
  baseAmplitude: 0.12,
  spikeFrequency: 0,
  spikeAmplitude: 0,
  spikeColor: C.violet,
  baseColor: C.violet,
  label: 'Silent , night audit',
  eventTag: '11 PM safety check',
};

// ── Sensor baseline data ──────────────────────────────────────────────────────

export const SENSOR_BASELINES: SensorReading[] = [
  { name: 'Water Motor',   value: 72, unit: '%',    color: C.green,  statusLabel: 'Running' },
  { name: 'LPG Cylinder',  value: 38, unit: '%',    color: C.amber                          },
  { name: 'Inverter / UPS',value: 91, unit: '%',    color: C.text3,  statusLabel: 'Grid'    },
  { name: 'Pooja Room',    value: 60, unit: 'warm', color: C.violet                         },
];

// ── Scenario definitions ──────────────────────────────────────────────────────

export const SCENARIOS: ActiveScenario[] = [
  {
    id: 'jeera',
    tier: 'T1',
    roomGlow: 'kitchen',
    roomState: '[HIGH_ENERGY_STATE]',
    glowColor: C.amber,
    waveformProfile: JEERA_PROFILE,
    alertCard: {
      badgeLabel: '[T1 EDGE ML] CULINARY ALERT',
      badgeColor: C.amber,
      badgeBg: C.amberBg,
      text: '"The oil sounds too hot before you add the jeera. Frequency spike at 800Hz detected."',
      primaryAction: 'Reduce burner',
      actionType: 'none',
    },
    cartItems: [
      { name: 'Sunflower Oil 1L', priceINR: '₹138', badge: 'SUGGESTED', badgeColor: 'cyan', triggerScenario: 'jeera' },
    ],
    intelTab: 'cascade',
    ms: '<80ms',
    cost: '$0.00',
    badgeLabel: 'T1',
    title: 'Jeera Burning Detection',
    subDesc: 'Edge ML · audio embedding · <80ms',
    narration: 'Alexa detected a frequency spike at 800 hertz in the kitchen. This means the oil is too hot before adding jeera. T1 edge ML on your local hub caught this in under 80 milliseconds. No cloud was used.',
    apiFn: () => backendApi.simulateUnknownSound(),
    humanTitle: 'Oil too hot for jeera',
    humanTier: 'runs on device',
    roomName: 'Kitchen',
    modelExplainer: 'Edge ML: YAMNet-style model (MobileNetV1, 96×64 mel-spectrogram, 521 AudioSet classes). Detects 800Hz oil-sizzle spikes on hub CPU in <80ms.',
    walkthroughSteps: ['Mic array captures 800Hz frequency spike', 'Edge ML classifies as hot-oil signature in <80ms', 'T1 alert fires , notify + suggest reduce flame', 'No cloud used , runs entirely on local hub'],
    alexaMessage: {
      dadi:   'Beta, tel bahut garam ho gayi hai. Jeera abhi mat daalna.',
      parent: 'The oil sounds really hot , might want to wait before adding the jeera.',
      child:  'Hey! The oil is too hot for jeera right now. Wait a bit.',
    },
  },
  {
    id: 'pressure',
    tier: 'T0',
    roomGlow: 'kitchen',
    roomState: '[ACOUSTIC_ALERT]',
    glowColor: C.green,
    waveformProfile: PRESSURE_PROFILE,
    alertCard: {
      badgeLabel: '[T0 REFLEX] WHISTLE COUNT',
      badgeColor: C.green,
      badgeBg: C.greenBg,
      text: '"Whistle detected. On 3rd whistle, gas burner dials down via local rule , no cloud needed."',
      primaryAction: 'Override',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'T0',
    title: 'Pressure Cooker Whistle',
    subDesc: 'Reflex rule · whistle_count++ · <10ms',
    narration: 'Pressure cooker whistle detected. That is whistle number 3. A T0 reflex rule automatically dials down the gas burner. This took under 10 milliseconds and cost nothing. Your dal is ready.',
    apiFn: () => backendApi.simulateMotorSafety(),
    humanTitle: 'Pressure cooker: 3 whistles done',
    humanTier: 'runs on device',
    roomName: 'Kitchen',
    modelExplainer: 'T0 Reflex: threshold rule engine. IF WHISTLE_COUNT_3 → CUT_BURNER + NOTIFY. Runs in <10ms on local CPU. No model, no cloud.',
    walkthroughSteps: ['Acoustic transient (1–4kHz) detected', 'T0 counter rule: whistle_count++', 'On 3rd count: dial down burner via local relay', 'Notification sent , dal is ready'],
    alexaMessage: {
      dadi:   'Teen seeti ho gayi. Dal taiyaar hai , maine gas dheemi kar di.',
      parent: 'Three whistles done , your dal is ready. I dialled the gas burner down automatically.',
      child:  'Pressure cooker hit 3 whistles. Gas burner turned down , dal is ready.',
    },
  },
  {
    id: 'grid',
    tier: 'T0',
    roomGlow: 'all',
    roomState: '[POWER_CUT_MODE]',
    glowColor: C.red,
    waveformProfile: GRID_PROFILE,
    alertCard: {
      badgeLabel: '[T0 FAIL-SAFE] INVERTER MODE',
      badgeColor: C.red,
      badgeBg: C.redBg,
      text: '"Grid lost. Switched to inverter. Water motor dead-man timer: 45 min to auto-cutoff. Critical devices protected."',
      primaryAction: 'Extend timer',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'PWR',
    title: 'Grid Failure , Inverter Mode',
    subDesc: 'Local fail-safe · dead-man timer · $0',
    narration: 'Grid power lost. Alexa switched to inverter instantly using a T0 fail-safe rule. No internet was needed. A 45 minute dead-man timer has been set for the water motor. All critical devices are protected.',
    apiFn: () => backendApi.simulatePowerCut(),
    humanTitle: 'Power cut: inverter kicked in',
    humanTier: 'runs on device',
    roomName: 'Home',
    modelExplainer: 'T0 Fail-safe: IF GRID_LOSS → SWITCH_INVERTER + TIMER_45MIN. Hardware interrupt, sub-millisecond response. Dead-man timer protects water motor.',
    walkthroughSteps: ['Grid voltage drops to 0V , hardware interrupt fires', 'T0 rule: switch to inverter UPS instantly', 'Dead-man timer set: 45 min auto-cutoff for water motor', 'All critical devices protected , no internet needed'],
    alexaMessage: {
      dadi:   'Bijli gayi hai. Inverter chalu ho gaya. Fridge aur Wi-Fi sahi hai.',
      parent: 'Power just cut. Switched to inverter. Fridge and Wi-Fi are on backup.',
      child:  'Power cut! Switched to inverter automatically. All good.',
    },
  },
  {
    id: 'pooja',
    tier: 'T2',
    roomGlow: 'pooja',
    roomState: '[RESTING_STATE]',
    glowColor: C.violet,
    waveformProfile: POOJA_PROFILE,
    alertCard: {
      badgeLabel: '[T2 TEMPORAL] REGIME SHIFT',
      badgeColor: C.violet,
      badgeBg: C.violetBg,
      text: '"6:00 AM detected. Warm lights activated. Bhajans playlist started. Alert volumes suppressed for morning routine."',
      primaryAction: 'View schedule',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<300ms',
    cost: '$0.00',
    badgeLabel: 'REG',
    title: 'Pooja Room , 6:00 AM Shift',
    subDesc: 'Temporal guardrail · regime = festival',
    narration: 'Good morning. It is 6 AM. Alexa shifted the home to devotional regime using a T2 temporal guardrail on your local hub. Warm lights are on, bhajans have started quietly, and all alerts are muted until 8 AM.',
    apiFn: () => backendApi.simulateStudyMode(),
    humanTitle: '6 AM: Morning routine started',
    humanTier: 'runs on device',
    roomName: 'Pooja Room',
    modelExplainer: 'T2 Temporal guardrail: time schedule on local hub. IF TIME_0600 → SET_LIGHTS_WARM + REGIME_RESTING. No NLP, no cloud , pure cron.',
    walkthroughSteps: ['Local hub cron fires at 06:00', 'T2 temporal rule: shift regime to RESTING_STATE', 'Warm lights on, speaker volume reduced', 'Bhajans playlist queued , all in <300ms locally'],
    alexaMessage: {
      dadi:   'Pranam. Subah ho gayi. Pooja mode chalu hai.',
      parent: 'Good morning. Peaceful mode on , fan low, speaker off, soft light.',
      child:  'Good morning! Pooja mode started. Keeping it quiet.',
    },
  },
  {
    id: 'geyser',
    tier: 'T0',
    roomGlow: 'bathroom',
    roomState: '[ANOMALY_DETECTED]',
    glowColor: C.red,
    waveformProfile: GEYSER_PROFILE,
    alertCard: {
      badgeLabel: '[T0 LTM ANOMALY] SAFETY CUT-OFF',
      badgeColor: C.red,
      badgeBg: C.redBg,
      text: '"Geyser on 45 min , 2× your usual 20-min average. AI has secured the appliance. No cloud needed."',
      primaryAction: 'View LTM graph',
      actionType: 'ltm',
    },
    intelTab: 'memory',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'T0',
    title: 'Forgotten Geyser , 45 min',
    subDesc: 'LTM anomaly · safety cut-off · $0',
    narration: 'The geyser has been running for 45 minutes. Your usual average is 20 minutes. Alexa flagged this as an anomaly using long-term memory and cut the power automatically with a T0 reflex rule. Your family is safe.',
    apiFn: () => backendApi.simulateGeyser(),
    humanTitle: 'Geyser on 40 minutes',
    humanTier: 'runs on device',
    roomName: 'Bathroom',
    modelExplainer: 'T0 LTM Anomaly: geyser on 45min vs 20min LTM average. IF GEYSER_ANOMALY → CUT_GEYSER + NOTIFY. Uses long-term memory from 90-day usage patterns.',
    walkthroughSteps: ['LTM vault: geyser avg = 20 min (90-day pattern)', 'Current session: 45 min → anomaly flag triggered', 'T0 safety rule: cut geyser power via local relay', 'Push notification sent , no cloud call made'],
    alexaMessage: {
      dadi:   'Geyser 40 minute se chal raha hai. Bandh kar doon?',
      parent: 'Geyser has been on 40 minutes. Want me to turn it off?',
      child:  'Heads up , geyser\'s been on 40 mins. Turn it off?',
    },
  },
  {
    id: 'away',
    tier: 'T3',
    roomGlow: 'living',
    roomState: '[PRESENCE_DETECTED]',
    glowColor: C.cyan,
    waveformProfile: AWAY_PROFILE,
    alertCard: {
      badgeLabel: '[T3 BEDROCK] PET DETECTED',
      badgeColor: C.amber,
      badgeBg: C.amberBg,
      text: '"You\'ve left the geofence, but I detect your dog is still in the Living Room. Securing LPG and water motor. Should I keep the AC at 24°C for him?"',
      primaryAction: 'Yes, keep AC',
      actionType: 'branch',
    },
    intelTab: 'agents',
    ms: '~1.2s',
    cost: '$0.00006',
    badgeLabel: 'T3',
    title: 'Away Mode , Presence Fusion',
    subDesc: 'BLE geofence · pet-guard branch · Bedrock',
    narration: 'You left the geofence, but a Bluetooth signature matching your dog is still in the living room. This required T3 Bedrock because it needed to fuse geofence data, BLE sensors, and the home camera simultaneously. LPG and water motor are now secured. Should I keep the air conditioner on for him?',
    apiFn: () => backendApi.simulateVoiceCommand(undefined, 'simulate away mode with presence detection'),
    humanTitle: "You've left home , securing",
    humanTier: 'asked the cloud once',
    roomName: 'Home',
    modelExplainer: 'T3 Multi-agent: Claude Haiku fuses BLE geofence + camera feed + occupancy in one call. Result cached 6h. ~$0.00006 per decision.',
    walkthroughSteps: ['BLE geofence exit detected (phone left boundary)', 'T3 Bedrock: fuse BLE + camera + occupancy data', 'Pet presence confirmed , adapt security accordingly', 'LPG + water motor secured; AC maintained for pet'],
    alexaMessage: {
      dadi:   'Aap ghar se bahar hain. Ghar band kar doon?',
      parent: "You're outside. Should I switch off ACs and lock the LPG?",
      child:  "You've left home. Want me to secure everything?",
    },
  },
  {
    id: 'chai',
    tier: 'T0',
    roomGlow: 'kitchen',
    roomState: '[TIMER_ACTIVE]',
    glowColor: C.amber,
    waveformProfile: CHAI_PROFILE,
    alertCard: {
      badgeLabel: '[T0 REFLEX] CHAI TIMER',
      badgeColor: C.amber,
      badgeBg: C.amberBg,
      text: '"Chai is on the stove. 8-minute timer started. I\'ll alert you before it boils over."',
      primaryAction: 'Set 8-min timer',
      actionType: 'timer',
    },
    intelTab: 'cascade',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'T0',
    title: 'Chai on Stove , Timer',
    subDesc: 'T0 reflex timer · stove monitoring · $0',
    narration: 'Chai timer started. Your chai will be ready in 8 minutes. A T0 reflex rule is monitoring the stove. I will alert you 2 minutes before it boils over.',
    apiFn: () => backendApi.simulateMotorSafety(),
    humanTitle: 'Chai on gas , 8 min timer',
    humanTier: 'runs on device',
    roomName: 'Kitchen',
    modelExplainer: 'T0 Reflex: stove timer rule. IF STOVE_ON + TIME_ELAPSED_6MIN → NOTIFY_CHAI_READY. Runs in <10ms on hub. No cloud, no model.',
    walkthroughSteps: ['Stove activity detected via power sensor', 'T0 timer rule started: 8 minute countdown', 'At 6 min: pre-alert fires , chai almost ready', 'At 8 min: alert fires , turn off stove'],
    alexaMessage: {
      dadi:   'Chai 8 minute mein taiyaar ho jayegi. Main alert karungi.',
      parent: 'Chai timer set for 8 minutes. I\'ll remind you.',
      child:  'Chai timer started! 8 mins to go.',
    },
  },
  {
    id: 'milk_overflow',
    tier: 'T1',
    roomGlow: 'kitchen',
    roomState: '[BOIL_OVER_RISK]',
    glowColor: C.red,
    waveformProfile: MILK_PROFILE,
    alertCard: {
      badgeLabel: '[T1 EDGE ML] MILK ALERT',
      badgeColor: C.red,
      badgeBg: C.redBg,
      text: '"Milk bubble frequency spiking , boil-over in under 30 seconds. Reduce heat now."',
      primaryAction: 'Reduce burner',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<80ms',
    cost: '$0.00',
    badgeLabel: 'T1',
    title: 'Milk About to Boil Over',
    subDesc: 'Edge ML · bubble frequency · <80ms',
    narration: 'Alert! Milk bubble frequency is spiking between 80 and 500 hertz. This acoustic pattern indicates boil-over in under 30 seconds. T1 edge machine learning caught this before it happens. Please reduce the heat.',
    apiFn: () => backendApi.simulateUnknownSound(),
    humanTitle: 'Milk about to boil over',
    humanTier: 'runs on device',
    roomName: 'Kitchen',
    modelExplainer: 'Edge ML: YAMNet classifies 80–500Hz bubble surge pattern. Boil-over signature differs from normal simmer by frequency density. Detected in <80ms on hub.',
    walkthroughSteps: ['Mic array captures low-frequency bubble sounds', 'Edge ML: bubble density exceeds boil-over threshold', 'T1 alert: notify immediately + suggest reduce heat', 'Catches it 30 seconds before overflow , no mess'],
    alexaMessage: {
      dadi:   'Doodh ubalne wala hai! Gas kam karo jaldi.',
      parent: 'Milk is about to overflow! Turn down the burner.',
      child:  'Quick! Milk is boiling over , reduce heat now!',
    },
  },
  {
    id: 'guest_doorbell',
    tier: 'T0',
    roomGlow: 'living',
    roomState: '[GUEST_ARRIVAL]',
    glowColor: C.cyan,
    waveformProfile: GUEST_PROFILE,
    alertCard: {
      badgeLabel: '[T0 REFLEX] GUEST ARRIVED',
      badgeColor: C.cyan,
      badgeBg: C.cyanBg,
      text: '"Doorbell detected. Switching to guest mode , lights on, AC on, camera active."',
      primaryAction: 'Switch to guest mode',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'T0',
    title: 'Guest at the Door',
    subDesc: 'T0 doorbell reflex · guest mode · <10ms',
    narration: 'Someone is at the door! A T0 reflex rule detected the doorbell transient and is switching to guest mode. Lights are on, AC is on at 24 degrees, and the front camera is now active. Would you like me to unlock the door?',
    apiFn: () => backendApi.simulateVoiceCommand(undefined, 'guest mode'),
    humanTitle: 'Guest at the door',
    humanTier: 'runs on device',
    roomName: 'Living Room',
    modelExplainer: 'T0 Reflex: IF DOORBELL_TRANSIENT → SET_REGIME_GUEST + CAMERA_ON. Acoustic doorbell detection (1–3kHz click pattern) in <10ms.',
    walkthroughSteps: ['Doorbell transient detected (1–3kHz click)', 'T0 rule: switch regime to GUEST mode instantly', 'Living room lights on, AC set to 24°C', 'Front camera activated , see who\'s there'],
    alexaMessage: {
      dadi:   'Koi dwar pe aaya hai. Guest mode on kar diya.',
      parent: 'Someone at the door! Guest mode on , lights and AC ready.',
      child:  'Doorbell! I\'ve switched to guest mode.',
    },
  },
  {
    id: 'son_study',
    tier: 'T2',
    roomGlow: 'office',
    roomState: '[STUDY_MODE]',
    glowColor: C.cyan,
    waveformProfile: { baseAmplitude: 0.05, spikeFrequency: 0, spikeAmplitude: 0, spikeColor: C.cyan, baseColor: C.cyan, label: 'Quiet , study mode', eventTag: 'Study timer: 2h session' },
    alertCard: {
      badgeLabel: '[T2 SCHEDULE] STUDY TIME',
      badgeColor: C.cyan,
      badgeBg: C.cyanBg,
      text: '"6 PM study time started. Notifications muted, office light at reading brightness, phone on silent."',
      primaryAction: 'Enable do-not-disturb',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<300ms',
    cost: '$0.00',
    badgeLabel: 'T2',
    title: 'Son\'s Study Time , 6 PM',
    subDesc: 'T2 temporal guardrail · office · $0',
    narration: 'It is 6 PM , time for Arjun to study. I have activated study mode. Office light is at reading brightness, phone notifications are muted, and TV volume is reduced. Study well!',
    apiFn: () => backendApi.simulateStudyMode(),
    humanTitle: 'Study time , 6 PM',
    humanTier: 'hub schedule',
    roomName: 'Office',
    modelExplainer: 'T2 Temporal guardrail: cron fires at 18:00 on school days. IF TIME_1800 + WEEKDAY → STUDY_MODE. Sets light lux, mutes alerts, reduces TV volume. No NLP, no cloud.',
    walkthroughSteps: ['Internal cron fires at 18:00 on weekdays', 'T2 checks calendar: school day? → yes', 'Office light → 400 lux reading mode; alerts → muted', 'TV volume → 5%; 2h timer started, review at 20:00'],
    alexaMessage: {
      dadi:   'Beta, 6 baj gaye hain. Padhne ka time hai. Sab notifications band kar diye.',
      parent: '6 PM! Study mode on. Office light set to reading brightness, notifications muted.',
      child:  'Study time! Focus mode on , notifications off, office light at reading level.',
    },
  },
  {
    id: 'night_check',
    tier: 'T0',
    roomGlow: 'all',
    roomState: '[SAFETY_AUDIT]',
    glowColor: C.violet,
    waveformProfile: NIGHT_PROFILE,
    alertCard: {
      badgeLabel: '[T0 AUDIT] NIGHT SAFETY',
      badgeColor: C.violet,
      badgeBg: C.violetBg,
      text: '"11 PM safety audit complete. Door: locked. Gas: off. Motor: off. Geyser: off. All safe."',
      primaryAction: 'View report',
      actionType: 'none',
    },
    intelTab: 'cascade',
    ms: '<10ms',
    cost: '$0.00',
    badgeLabel: 'T0',
    title: '11 PM Night Safety Audit',
    subDesc: 'T0 scheduled audit · all rooms · $0',
    narration: 'Good night. 11 PM safety audit complete. Front door is locked. Gas valve is closed. Water motor is off. Geyser is off. All windows are closed. You are safe to sleep.',
    apiFn: () => backendApi.simulateNightSafety(),
    humanTitle: '11 PM safety check',
    humanTier: 'runs on device',
    roomName: 'Home',
    modelExplainer: 'T0 Scheduled audit: IF TIME_2300 → CHECK_ALL_SENSORS. Polls door lock, gas sensor, motor relay, geyser in sequence. Pure rule engine, no cloud.',
    walkthroughSteps: ['Local cron fires at 23:00', 'T0 audit: poll all safety sensors in sequence', 'Anomalies: auto-close gas valve, lock door', 'Summary notification , no cloud call made'],
    alexaMessage: {
      dadi:   'Raat ki safety check ho gayi. Sab theek hai. So jao.',
      parent: 'Night safety check done. Door locked, gas off. Sleep well.',
      child:  'All clear! 11 PM safety check passed.',
    },
  },
];
