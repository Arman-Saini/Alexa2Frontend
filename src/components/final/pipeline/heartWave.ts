/**
 * Two-Gaussian "lub-dub" heartbeat waveform, shared by heart core scale,
 * highlight glow and blood-cell speed.
 */
export function heartWave(tSec: number, bpm: number): number {
  let phase = ((tSec * bpm) / 60) % 1;
  if (phase < 0) phase += 1; // normalize negative t into [0,1)
  return (
    Math.exp(-(((phase - 0.10) / 0.045) ** 2)) +
    0.55 * Math.exp(-(((phase - 0.28) / 0.06) ** 2))
  );
}
