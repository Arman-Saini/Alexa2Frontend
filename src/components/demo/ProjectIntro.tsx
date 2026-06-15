import { useEffect, useRef } from 'react';
import { C, F } from './ScenarioDefs';

interface Props {
  onEnterDemo: () => void;
}

const STATS = [
  { value: '600M+', label: 'Alexa devices sold globally' },
  { value: '3%',    label: 'advanced features used on average' },
  { value: '∞',     label: 'untapped household potential' },
];

const PILLARS = [
  {
    icon: '⚡',
    title: 'MCP-Style Device Integration',
    body: 'The hardest problem in smart homes is connecting devices. Every vendor speaks a different protocol, exposing isolated products instead of composable capabilities. We solve this with a modular integration framework — inspired by MCP — where any device is registered once and immediately available as a standardised capability across all automations.',
    accent: C.cyan,
    bg: '#0D1F24',
  },
  {
    icon: '🧠',
    title: 'Multi-Tier Local Intelligence',
    body: 'Most requests never leave the house. A three-tier compute model runs T0 rules in under 2 ms on-device, handles T1/T2 locally for pattern recognition, and only reaches the cloud for novel T3 queries — reducing latency, cost, and dependence on internet connectivity.',
    accent: C.violet,
    bg: '#1A0D24',
  },
  {
    icon: '🏡',
    title: 'Built for Indian Homes',
    body: 'Multi-generational families, LPG cooktops, inverter schedules, pooja-room silences, chai rituals — none of this exists in Western smart-home datasets. Alexa+ India learns real household patterns and proactively suggests automations grounded in cultural context.',
    accent: C.green,
    bg: '#0D1F12',
  },
  {
    icon: '🔒',
    title: 'Privacy-First by Design',
    body: 'All recommendations are explainable. Users see exactly why an automation was suggested and stay in full control — approve, reject, or modify any rule. Personal data is processed on-device whenever possible; nothing opaque ever reaches the cloud.',
    accent: C.amber,
    bg: '#1F1A0D',
  },
];

export function ProjectIntro({ onEnterDemo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,191,255,${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%', background: '#080808',
      overflowY: 'auto', position: 'relative',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Particle layer */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '60px 32px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.25)', borderRadius: 20, padding: '5px 14px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, display: 'inline-block', boxShadow: '0 0 6px #00BFFF' }} />
            <span style={{ fontSize: F.badge, color: C.cyan, fontWeight: 600, letterSpacing: 1 }}>AMAZON HACKATHON 2025</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Alexa<span style={{ color: C.cyan }}>+</span> India
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#8899AA', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.6 }}>
            The smart home that actually understands your home — not just your voice commands.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 40 }}>
            {STATS.map(s => (
              <div key={s.value} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: C.cyan, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: F.badge, color: '#556677', marginTop: 4, maxWidth: 120 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onEnterDemo}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 36px', borderRadius: 10,
              background: 'linear-gradient(135deg, #0099CC 0%, #0066AA 100%)',
              border: 'none', color: '#FFFFFF', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.5,
              boxShadow: '0 0 32px rgba(0,153,204,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 48px rgba(0,153,204,0.6)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(0,153,204,0.4)'; }}
          >
            <span>Enter Live Demo</span>
            <span style={{ fontSize: '1.1rem' }}>→</span>
          </button>
        </div>

        {/* Problem statement */}
        <div style={{ marginBottom: 56, borderLeft: `3px solid ${C.cyan}`, paddingLeft: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>The Gap</h2>
          <p style={{ fontSize: '0.95rem', color: '#778899', lineHeight: 1.75, margin: 0 }}>
            Over 600 million Alexa-enabled devices have been sold worldwide, yet most households use only a fraction of their capabilities. The average user sticks to music, alarms, and weather — not because they don't want more, but because connecting devices and building automations is still too hard. We built Alexa+ India to close that gap for the world's fastest-growing smart-home market.
          </p>
        </div>

        {/* Pillars */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 }}>What Makes This Different</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 56 }}>
          {PILLARS.map(p => (
            <div key={p.title} style={{
              background: p.bg, border: `1px solid ${p.accent}22`,
              borderRadius: 12, padding: '20px 22px',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${p.accent}55`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${p.accent}22`; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: p.accent }}>{p.title}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#778899', lineHeight: 1.7, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div style={{ textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
          <p style={{ fontSize: '0.85rem', color: '#556677', marginBottom: 20 }}>
            Live demo — real WebSocket backend · Sarvam TTS · multi-tier compute cascade
          </p>
          <button
            onClick={onEnterDemo}
            style={{
              padding: '12px 32px', borderRadius: 8,
              background: 'transparent',
              border: `1.5px solid ${C.cyan}`,
              color: C.cyan, fontSize: '0.9rem', fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.5,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.cyanBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Enter Demo →
          </button>
        </div>
      </div>
    </div>
  );
}
