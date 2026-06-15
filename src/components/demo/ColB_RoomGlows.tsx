import { useEffect, useState } from 'react';
import type { ActiveScenario } from './ScenarioDefs';

// Percentages tuned to match the isometric 3D canvas layout.
// Adjust if the canvas layout changes.
const ROOM_POS: Record<string, { top: string; left: string; width: number; height: number }> = {
  kitchen:  { top: '28%', left: '14%', width: 118, height: 76 },
  bathroom: { top: '17%', left: '50%', width: 94,  height: 62 },
  living:   { top: '44%', left: '29%', width: 138, height: 88 },
  pooja:    { top: '34%', left: '62%', width: 82,  height: 54 },
};

interface Props { scenario: ActiveScenario }

export function ColB_RoomGlows({ scenario }: Props) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const fadeIn  = setTimeout(() => setOpacity(1),    60);
    const fadeOut = setTimeout(() => setOpacity(0), 5500);
    return () => { clearTimeout(fadeIn); clearTimeout(fadeOut); };
  }, [scenario.id]);

  const { roomGlow, glowColor, roomState } = scenario;
  if (roomGlow === null) return null;

  const transition = 'opacity 0.45s ease';

  // All-room flash for grid failure
  if (roomGlow === 'all') {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `${glowColor}0E`, border: `1px solid ${glowColor}28`, opacity, transition }}
      >
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2"
          style={{
            fontSize: 8, fontWeight: 700, padding: '2px 9px', borderRadius: 3, letterSpacing: '0.10em',
            color: glowColor, background: `${glowColor}18`, border: `1px solid ${glowColor}40`,
            whiteSpace: 'nowrap',
          }}
        >
          {roomState}
        </div>
      </div>
    );
  }

  const pos = ROOM_POS[roomGlow];
  if (!pos) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: pos.top, left: pos.left,
        width: pos.width, height: pos.height,
        background: `${glowColor}0C`,
        border: `1px solid ${glowColor}48`,
        boxShadow: `0 0 22px ${glowColor}22`,
        borderRadius: 4,
        opacity,
        transition,
      }}
    >
      <div
        style={{
          position: 'absolute', top: -16, left: 0,
          fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', whiteSpace: 'nowrap',
          color: glowColor,
        }}
      >
        {roomState}
      </div>
    </div>
  );
}
