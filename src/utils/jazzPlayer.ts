// Soulful jazz beat generator using Web Audio API
let ctx: AudioContext | null = null;
let schedulerHandle: ReturnType<typeof setInterval> | null = null;
let beatIndex = 0;

// Jazz chord progressions (frequencies in Hz) - Am7 → Dm7 → G7 → Cmaj7
const CHORDS: number[][] = [
  [110, 138.59, 164.81, 207.65], // Am7 (bass octave)
  [110, 146.83, 174.61, 220],    // Dm7
  [98,  123.47, 146.83, 185.00], // G7
  [130.81, 164.81, 196, 246.94], // Cmaj7
];
const BEAT_MS = 550; // ~109 bpm swing feel

function scheduleChord() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const chord = CHORDS[Math.floor(beatIndex / 4) % CHORDS.length];
  const beat = beatIndex % 4;

  // Bass note (every beat)
  const bass = ctx.createOscillator();
  const bassG = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(chord[beat % chord.length], now);
  bassG.gain.setValueAtTime(0.18, now);
  bassG.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  bass.connect(bassG); bassG.connect(ctx.destination);
  bass.start(now); bass.stop(now + 0.45);

  // Chord hit on beats 1 and 3
  if (beat === 0 || beat === 2) {
    chord.slice(1).forEach((freq) => {
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g); g.connect(ctx!.destination);
      osc.start(now); osc.stop(now + 0.4);
    });
  }

  // Hi-hat / percussion on every beat (noise burst)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const hg = ctx.createGain();
  src.buffer = buf;
  hg.gain.setValueAtTime(beat % 2 === 0 ? 0.15 : 0.08, now);
  src.connect(hg); hg.connect(ctx.destination);
  src.start(now);

  beatIndex++;
}

export function playJazz() {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    beatIndex = 0;
    scheduleChord();
    schedulerHandle = setInterval(scheduleChord, BEAT_MS);
  } catch { /* browser may block without user gesture */ }
}

export function stopJazz() {
  if (schedulerHandle) { clearInterval(schedulerHandle); schedulerHandle = null; }
  if (ctx) { ctx.close().catch(() => {}); ctx = null; }
  beatIndex = 0;
}

export function isJazzPlaying() { return ctx !== null; }
