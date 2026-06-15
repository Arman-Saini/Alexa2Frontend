import { useEffect, useRef } from 'react';
import type { WaveformProfile } from './ScenarioDefs';
import { C } from './ScenarioDefs';

const BIN_COUNT = 28;

// Pre-computed per-bin phase/speed so RAF loop is deterministic
const PHASES = Array.from({ length: BIN_COUNT }, (_, i) => (i / BIN_COUNT) * Math.PI * 2);
const SPEEDS = Array.from({ length: BIN_COUNT }, (_, i) => 0.4 + ((i * 7919) % 100) / 100);

interface Props {
  profile: WaveformProfile;
  height?: number;
}

export function WaveformCanvas({ profile, height = 40 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const profileRef = useRef(profile);
  const spikes     = useRef(new Float32Array(BIN_COUNT));
  const frameRef   = useRef(0);
  const prevTs     = useRef(0);

  // Sync profile without restarting the RAF loop
  profileRef.current = profile;

  // Reset spikes when the scenario changes (profile label is unique per scenario)
  useEffect(() => { spikes.current.fill(0); }, [profile.label]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (ts: number) => {
      const dt = Math.min(ts - prevTs.current, 50);
      prevTs.current = ts;
      const p = profileRef.current;

      // Resize canvas to CSS size on first draw or after layout change
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      const barW = Math.max(3, Math.floor((w - BIN_COUNT) / BIN_COUNT));
      const gap  = 1;

      // Probabilistically inject a spike cluster
      if (p.spikeFrequency > 0) {
        const prob = p.spikeFrequency * dt * 0.001;
        if (Math.random() < prob) {
          const center = 8 + Math.floor(Math.random() * (BIN_COUNT - 16));
          for (let j = -1; j <= 1; j++) {
            const idx = center + j;
            if (idx >= 0 && idx < BIN_COUNT) {
              spikes.current[idx] = p.spikeAmplitude * (j === 0 ? 1 : 0.55);
            }
          }
        }
      }

      for (let i = 0; i < BIN_COUNT; i++) {
        // Decay
        spikes.current[i] = Math.max(0, spikes.current[i] - dt * 0.003);

        const base  = p.baseAmplitude * 0.6 * (1 + Math.sin(ts * 0.001 * SPEEDS[i] + PHASES[i]));
        const spike = spikes.current[i];
        const barH  = Math.min(1, base + spike) * h;

        const isSpike = spike > 0.25;
        ctx.globalAlpha = isSpike ? 0.9 : 0.55;
        ctx.fillStyle   = isSpike ? p.spikeColor : p.baseColor;
        ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
      }
      ctx.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []); // intentionally empty , RAF loop runs forever, reads profileRef

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, display: 'block' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 7, color: C.text3 }}>
        <span>20 Hz</span>
        {profile.eventTag && (
          <span style={{ color: C.amber, fontWeight: 700 }}>{profile.eventTag}</span>
        )}
        <span>8 kHz</span>
      </div>
    </div>
  );
}
