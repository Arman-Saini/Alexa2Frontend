import type { PlacedObject, AlexaDeviceState } from '../types';

export type CommandTier = 'T0_LOCAL' | 'T1_LOCAL' | 'BACKEND_NEEDED';

export interface CommandResult {
  matched: boolean;
  response: string;
  tier: CommandTier;
  updates: { id: string; changes: Partial<AlexaDeviceState> }[];
  roomFocus?: string | null; // null = show all rooms, undefined = no change
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[,;:!?.]+/g, ' ')
    .replace(/\b(please|alexa|hey alexa|okay alexa|ok alexa|bhai|yaar|can\s+you|could\s+you|will\s+you|would\s+you|i\s+want\s+(you\s+to\s+)?|i\s+need\s+(you\s+to\s+)?|for\s+me)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Returns true (ON), false (OFF), or null (no action detected)
function detectAction(q: string): boolean | null {
  if (/\b(turn\s+on|switch\s+on|put\s+on|power\s+on|enable|start|chalao|chalu)\b/.test(q)) return true;
  if (/\b(turn\s+off|switch\s+off|put\s+off|shut\s+off|power\s+off|disable|stop|cut|band\s+kar|bandh)\b/.test(q)) return false;
  if (/\bout\b/.test(q) && /\blight/.test(q)) return false; // "lights out"
  if (/\bon\b/.test(q) && !/\boff\b/.test(q)) return true;
  if (/\boff\b/.test(q) && !/\bon\b/.test(q)) return false;
  return null;
}

// Room ID → display name
const ROOM_LABEL: Record<string, string> = {
  'living-room': 'living room',
  'kitchen': 'kitchen',
  'master-bedroom': 'bedroom',
  'bathroom': 'bathroom',
  'office': 'office',
};

// Keyword → room ID
const ROOM_ALIASES: [RegExp, string][] = [
  [/\b(living\s*room|hall|lounge|drawing\s*room|sitting\s*room|front\s*room|parlou?r)\b/, 'living-room'],
  [/\bkitchen\b/, 'kitchen'],
  [/\b(master\s*bed\s*room|master\s*bedroom|master|bedroom|bed\s*room|sleeping\s*room)\b/, 'master-bedroom'],
  [/\b(bath\s*room|bathroom|toilet|washroom|restroom|bath|loo)\b/, 'bathroom'],
  [/\b(home\s*office|office|study|work\s*room|study\s*room)\b/, 'office'],
];

function extractRoom(q: string): string | null {
  for (const [re, id] of ROOM_ALIASES) {
    if (re.test(q)) return id;
  }
  return null;
}

// Find all devices of a type, optionally filtered to a room
function byType(objects: PlacedObject[], type: string, roomId?: string | null): PlacedObject[] {
  return objects.filter(
    o => o.type === type && o.isAlexaDevice && (roomId === undefined || o.parentRoomId === roomId)
  );
}

function applyTo(objects: PlacedObject[], type: string, changes: Partial<AlexaDeviceState>, roomId?: string | null) {
  return byType(objects, type, roomId).map(o => ({ id: o.id, changes }));
}

// ── Main processor ────────────────────────────────────────────────────────────

export function processCommand(raw: string, objects: PlacedObject[]): CommandResult {
  const q = normalize(raw);
  const action = detectAction(q);
  const room = extractRoom(q);

  const unmatched: CommandResult = {
    matched: false,
    response: "I can help with lights, fans, TV, geyser, and scenes. Try \"bedroom fan on\" or \"good night\".",
    tier: 'BACKEND_NEEDED',
    updates: [],
  };

  // ─── SCENES (T0) ──────────────────────────────────────────────────────────

  if (/\bgood\s+morning\b|\bmorning\s+mode\b|\bwake\s+up\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Good morning! Bright lights on, temperature set to 22°C.',
      roomFocus: null,
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 100, colorTemp: 5000 }),
        ...applyTo(objects, 'thermostat', { isOn: true, temperature: 22 }),
        ...applyTo(objects, 'ceiling-fan', { isOn: false }),
      ],
    };
  }

  if (/\bgood\s+night\b|\bbed\s*time\b|\bnight\s+mode\b|\bsleep\s+mode\b|\bgo\s+to\s+sleep\b/.test(q)) {
    const controllable = objects.filter(o =>
      o.isAlexaDevice && !['camera', 'smoke-detector', 'motion-sensor', 'doorbell'].includes(o.type)
    );
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Good night! All devices off, door locked.',
      roomFocus: null,
      updates: [
        ...controllable.map(o => ({ id: o.id, changes: { isOn: false } as Partial<AlexaDeviceState> })),
        ...applyTo(objects, 'smart-lock', { isLocked: true }),
      ],
    };
  }

  if (/\bmovie\s*(night|time|mode)?\b|\bcinema\s*mode\b|\bwatch\s*(a\s*)?movie\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Movie mode! Lights dimmed, TV on.',
      roomFocus: 'living-room',
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 20, colorTemp: 2700 }),
        ...applyTo(objects, 'smart-tv', { isOn: true, volume: 40 }, 'living-room'),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 1 }),
      ],
    };
  }

  if (/\baway\s+mode\b|\bi'?m\s+leaving\b|\bleaving\s*(home|now)?\b|\bgoodbye\b|\bbye\b/.test(q)) {
    const keepOn = ['camera', 'smoke-detector', 'motion-sensor', 'doorbell'];
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Away mode. Lights off, cameras on, door locked.',
      roomFocus: null,
      updates: [
        ...objects.filter(o => o.isAlexaDevice).map(o => ({
          id: o.id,
          changes: { isOn: keepOn.includes(o.type) } as Partial<AlexaDeviceState>,
        })),
        ...applyTo(objects, 'smart-lock', { isLocked: true }),
      ],
    };
  }

  if (/\b(study|focus|work|concentration)\s*mode\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Focus mode. Bright light in office, other rooms dimmed.',
      roomFocus: 'office',
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: false }),
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 100, colorTemp: 5000 }, 'office'),
        ...applyTo(objects, 'ceiling-fan', { isOn: false }),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 2 }, 'office'),
      ],
    };
  }

  if (/\b(relax|chill|evening|sunset)\s*(mode|time|vibes?)?\b/.test(q) && !/\bgood\s+morning\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Evening relax. Warm dim lights, fans on low.',
      roomFocus: null,
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 30, colorTemp: 2700 }),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 1 }),
      ],
    };
  }

  if (/\b(romance|romantic|date\s*night|candle)\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Romance mode. Very dim warm lights.',
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: false }),
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 12, colorTemp: 2200 }, 'living-room'),
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 8, colorTemp: 2200 }, 'master-bedroom'),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 1 }),
      ],
    };
  }

  if (/\bparty\s*(mode|time|hard)?\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Party mode! All lights bright, fans on high.',
      roomFocus: null,
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 100, colorTemp: 4000 }),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 5 }),
      ],
    };
  }

  if (/\b(power\s*sav(ing)?|eco|energy\s*sav(ing)?)\s*(mode)?\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'Power saving mode. Fans, TVs and plugs off, lights dimmed.',
      updates: [
        ...applyTo(objects, 'ceiling-fan', { isOn: false }),
        ...applyTo(objects, 'smart-tv', { isOn: false }),
        ...applyTo(objects, 'smart-plug', { isOn: false }),
        ...applyTo(objects, 'air-purifier', { isOn: false }),
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 40 }),
      ],
    };
  }

  // ─── ROOM + ALL DEVICES ON/OFF (T1) — must come before global all-off ───────

  if (room !== null && action !== null) {
    const allDevices = /\b(everything|all\s+(the\s+)?(devices?|appliances?|things?|stuff|electronics?))\b/.test(q);
    const noDeviceType = !allDevices &&
      !/\b(light|bulb|lamp|tubelight|fan|tv|television|telly|geyser|water|lock|door|thermostat|ac|purifier|plug|heater|screen)\b/.test(q);
    if (allDevices || noDeviceType) {
      const controllable = objects.filter(o =>
        o.isAlexaDevice && o.parentRoomId === room &&
        !['camera', 'smoke-detector', 'motion-sensor', 'doorbell'].includes(o.type)
      );
      const label = ROOM_LABEL[room];
      return {
        matched: true, tier: 'T1_LOCAL',
        response: `All ${label} devices ${action ? 'on' : 'off'}.`,
        roomFocus: room,
        updates: controllable.map(o => ({ id: o.id, changes: { isOn: action } as Partial<AlexaDeviceState> })),
      };
    }
  }

  // ─── EVERYTHING ON / OFF (T0) ─────────────────────────────────────────────

  if (/\b(everything|all)\s+off\b|\bturn\s+off\s+(everything|all)\b|\bshut\s+(everything|all)\s+off\b|\ball\s+off\b/.test(q)) {
    const controllable = objects.filter(o =>
      o.isAlexaDevice && !['camera', 'smoke-detector', 'motion-sensor', 'doorbell'].includes(o.type)
    );
    return {
      matched: true, tier: 'T0_LOCAL',
      response: `All devices off.`,
      roomFocus: null,
      updates: controllable.map(o => ({ id: o.id, changes: { isOn: false } as Partial<AlexaDeviceState> })),
    };
  }

  if (/\b(everything|all)\s+on\b|\bturn\s+on\s+(everything|all)\b/.test(q)) {
    return {
      matched: true, tier: 'T0_LOCAL',
      response: 'All lights and fans on.',
      roomFocus: null,
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: true, brightness: 80 }),
        ...applyTo(objects, 'ceiling-fan', { isOn: true, speed: 2 }),
      ],
    };
  }

  // ─── ALL LIGHTS (T0) ─────────────────────────────────────────────────────

  if (
    /\ball\s+lights?\b|\blights?\s+out\b|\blights?\s+(on|off)\b/.test(q) ||
    (/\blight(s)?\b/.test(q) && action !== null && room === null &&
      /\b(turn|switch|put|all)\b/.test(q))
  ) {
    const isOn = action !== null ? action : /\bon\b/.test(q);
    const bulbs = byType(objects, 'smart-bulb');
    return {
      matched: true, tier: 'T0_LOCAL',
      response: `All ${bulbs.length} lights ${isOn ? 'on' : 'off'}.`,
      updates: applyTo(objects, 'smart-bulb', { isOn }),
    };
  }

  // ─── ALL FANS (T0) ───────────────────────────────────────────────────────

  if (/\ball\s+fans?\b|\bfans?\s+(on|off)\b/.test(q) && room === null) {
    const isOn = action !== null ? action : /\bon\b/.test(q);
    const fans = byType(objects, 'ceiling-fan');
    return {
      matched: true, tier: 'T0_LOCAL',
      response: `All ${fans.length} fans ${isOn ? 'on' : 'off'}.`,
      updates: applyTo(objects, 'ceiling-fan', { isOn }),
    };
  }

  // ─── ROOM + LIGHTS + FAN COMBO (T1) ──────────────────────────────────────

  if (room !== null && action !== null && /\blight/.test(q) && /\bfan\b/.test(q)) {
    const label = ROOM_LABEL[room];
    return {
      matched: true, tier: 'T1_LOCAL',
      response: `${action ? 'On' : 'Off'}: ${label} lights and fan.`,
      roomFocus: room,
      updates: [
        ...applyTo(objects, 'smart-bulb', { isOn: action }, room),
        ...applyTo(objects, 'ceiling-fan', { isOn: action }, room),
      ],
    };
  }

  // ─── ROOM + LIGHTS (T1) ───────────────────────────────────────────────────

  if (/\blight(s)?\b|\bbulb\b|\blamp\b|\btubelight\b/.test(q) && room !== null) {
    // Brightness value
    const bMatch = q.match(/\b(\d{1,3})\s*(%|percent)?\b/);
    if (bMatch && action === null) {
      const val = Math.min(100, Math.max(0, parseInt(bMatch[1])));
      return {
        matched: true, tier: 'T1_LOCAL',
        response: `${ROOM_LABEL[room]} brightness ${val}%.`,
        roomFocus: room,
        updates: applyTo(objects, 'smart-bulb', { isOn: val > 0, brightness: val }, room),
      };
    }
    // Dim
    if (/\bdim\b/.test(q)) {
      return {
        matched: true, tier: 'T1_LOCAL',
        response: `${ROOM_LABEL[room]} lights dimmed.`,
        roomFocus: room,
        updates: applyTo(objects, 'smart-bulb', { isOn: true, brightness: 20, colorTemp: 2700 }, room),
      };
    }
    // Brighten
    if (/\bbright(en)?\b|\bfull\b/.test(q)) {
      return {
        matched: true, tier: 'T1_LOCAL',
        response: `${ROOM_LABEL[room]} lights full brightness.`,
        roomFocus: room,
        updates: applyTo(objects, 'smart-bulb', { isOn: true, brightness: 100 }, room),
      };
    }
    // On/Off
    if (action !== null) {
      return {
        matched: true, tier: 'T1_LOCAL',
        response: `${ROOM_LABEL[room]} light ${action ? 'on' : 'off'}.`,
        roomFocus: room,
        updates: applyTo(objects, 'smart-bulb', { isOn: action }, room),
      };
    }
  }

  // ─── BRIGHTNESS (no room) (T0) ────────────────────────────────────────────

  if (/\bbright(ness)?\b|\bdim\b/.test(q) && room === null) {
    const bMatch = q.match(/\b(\d{1,3})\b/);
    if (bMatch) {
      const val = Math.min(100, Math.max(0, parseInt(bMatch[1])));
      return {
        matched: true, tier: 'T0_LOCAL',
        response: `All lights at ${val}% brightness.`,
        updates: applyTo(objects, 'smart-bulb', { isOn: val > 0, brightness: val }),
      };
    }
    if (/\bdim\b/.test(q)) {
      return {
        matched: true, tier: 'T0_LOCAL', response: 'All lights dimmed.',
        updates: applyTo(objects, 'smart-bulb', { isOn: true, brightness: 20, colorTemp: 2700 }),
      };
    }
    if (/\bbright(en)?\b/.test(q)) {
      return {
        matched: true, tier: 'T0_LOCAL', response: 'All lights at full brightness.',
        updates: applyTo(objects, 'smart-bulb', { isOn: true, brightness: 100 }),
      };
    }
  }

  // ─── COLOR TEMPERATURE (T0/T1) ────────────────────────────────────────────

  if (/\bwarm\s*(white)?\s*light|\bwarm\s*light|\bcozy\b/.test(q)) {
    const target = room ? applyTo(objects, 'smart-bulb', { isOn: true, colorTemp: 2700 }, room) : applyTo(objects, 'smart-bulb', { isOn: true, colorTemp: 2700 });
    return {
      matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
      response: `${room ? ROOM_LABEL[room] + ' ' : ''}lights set to warm white.`,
      updates: target,
      roomFocus: room ?? undefined,
    };
  }

  if (/\bcool\s*(white)?\s*light|\bdaylight|\bwhite\s+light|\bbright\s+white\b/.test(q)) {
    const target = room ? applyTo(objects, 'smart-bulb', { isOn: true, colorTemp: 5500 }, room) : applyTo(objects, 'smart-bulb', { isOn: true, colorTemp: 5500 });
    return {
      matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
      response: `${room ? ROOM_LABEL[room] + ' ' : ''}lights set to cool white.`,
      updates: target,
      roomFocus: room ?? undefined,
    };
  }

  // ─── ROOM + FAN (T1) ──────────────────────────────────────────────────────

  if (/\bfan\b|\bceiling\s*fan\b|\bexhaust\s*fan\b/.test(q)) {
    // Speed pattern: "fan speed 3" / "speed 3" / "at speed 3" / "fan at 3"
    const speedMatch = q.match(/\b(?:speed\s+(?:to\s+)?|at\s+speed\s+|at\s+)(\d)\b/);
    if (speedMatch) {
      const speed = Math.min(5, Math.max(1, parseInt(speedMatch[1])));
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      const label = room ? ROOM_LABEL[room] + ' ' : '';
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `${label}fan speed ${speed}.`,
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed } })),
      };
    }

    if (/\b(max|full|high|fastest|maximum)\b/.test(q)) {
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `Fan${fans.length > 1 ? 's' : ''} at max speed.`,
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed: 5 } })),
      };
    }

    if (/\b(low|min|slow|minimum|slowest)\b/.test(q)) {
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `Fan${fans.length > 1 ? 's' : ''} on low.`,
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed: 1 } })),
      };
    }

    if (/\b(medium|mid|moderate|normal)\b/.test(q)) {
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `Fan${fans.length > 1 ? 's' : ''} at medium.`,
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed: 3 } })),
      };
    }

    if (/\bfaster\b|\bspeed\s+up\b/.test(q)) {
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: 'Fan speed increased.',
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed: Math.min(5, (o.alexaDeviceState.speed ?? 2) + 1) } })),
      };
    }

    if (/\bslower\b|\bslow\s+down\b/.test(q)) {
      const fans = room ? byType(objects, 'ceiling-fan', room) : byType(objects, 'ceiling-fan');
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: 'Fan speed reduced.',
        roomFocus: room ?? undefined,
        updates: fans.map(o => ({ id: o.id, changes: { isOn: true, speed: Math.max(1, (o.alexaDeviceState.speed ?? 2) - 1) } })),
      };
    }

    if (action !== null) {
      const label = room ? ROOM_LABEL[room] + ' ' : '';
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `${label}fan ${action ? 'on' : 'off'}.`,
        roomFocus: room ?? undefined,
        updates: applyTo(objects, 'ceiling-fan', { isOn: action }, room ?? undefined),
      };
    }
  }

  // ─── TV (T0/T1) ───────────────────────────────────────────────────────────

  if (/\b(tv|television|telly|screen)\b/.test(q)) {
    // Volume
    const volN = q.match(/\bvolume\s+(?:to\s+)?(\d+)\b/);
    if (volN) {
      const vol = Math.min(100, Math.max(0, parseInt(volN[1])));
      const tvs = room ? byType(objects, 'smart-tv', room) : byType(objects, 'smart-tv');
      return { matched: true, tier: 'T1_LOCAL', response: `TV volume ${vol}.`, updates: tvs.map(o => ({ id: o.id, changes: { volume: vol } })) };
    }
    if (/\bvolume\s+up\b|\blouder\b/.test(q)) {
      const tvs = room ? byType(objects, 'smart-tv', room) : byType(objects, 'smart-tv');
      return { matched: true, tier: 'T1_LOCAL', response: 'Volume up.', updates: tvs.map(o => ({ id: o.id, changes: { volume: Math.min(100, (o.alexaDeviceState.volume ?? 30) + 10) } })) };
    }
    if (/\bvolume\s+down\b|\bquieter\b/.test(q)) {
      const tvs = room ? byType(objects, 'smart-tv', room) : byType(objects, 'smart-tv');
      return { matched: true, tier: 'T1_LOCAL', response: 'Volume down.', updates: tvs.map(o => ({ id: o.id, changes: { volume: Math.max(0, (o.alexaDeviceState.volume ?? 30) - 10) } })) };
    }
    if (/\bmute\b/.test(q)) {
      const tvs = byType(objects, 'smart-tv');
      return { matched: true, tier: 'T0_LOCAL', response: 'TV muted.', updates: tvs.map(o => ({ id: o.id, changes: { volume: 0 } })) };
    }
    // Channel
    const chN = q.match(/\bchannel\s+(?:to\s+)?(\d+)\b/);
    if (chN) {
      const ch = parseInt(chN[1]);
      const tvs = byType(objects, 'smart-tv');
      return { matched: true, tier: 'T1_LOCAL', response: `Channel ${ch}.`, updates: tvs.map(o => ({ id: o.id, changes: { channel: ch } })) };
    }
    if (action !== null) {
      const tvs = room
        ? byType(objects, 'smart-tv', room)
        : byType(objects, 'smart-tv', 'living-room').length > 0
          ? byType(objects, 'smart-tv', 'living-room')
          : byType(objects, 'smart-tv');
      const label = room ? `${ROOM_LABEL[room]} ` : '';
      return {
        matched: true, tier: room ? 'T1_LOCAL' : 'T0_LOCAL',
        response: `${label}TV ${action ? 'on' : 'off'}.`,
        roomFocus: room ?? 'living-room',
        updates: tvs.map(o => ({ id: o.id, changes: { isOn: action } })),
      };
    }
  }

  // ─── GEYSER / WATER HEATER (T0) ──────────────────────────────────────────

  if (/\b(geyser|water\s*heat(er)?|hot\s*water|geezer|boiler)\b/.test(q) && action !== null) {
    const plugs = objects.filter(o =>
      o.id === 'kt-plug' || (o.type === 'smart-plug' && o.parentRoomId === 'kitchen')
    );
    return {
      matched: true, tier: 'T0_LOCAL',
      response: `Geyser ${action ? 'on' : 'off'}.`,
      roomFocus: 'bathroom',
      updates: plugs.map(o => ({ id: o.id, changes: { isOn: action } })),
    };
  }

  // ─── SMART LOCK (T0) ─────────────────────────────────────────────────────

  if (/\b(door|lock|deadbolt)\b/.test(q)) {
    const locks = byType(objects, 'smart-lock');
    if (locks.length > 0) {
      if (/\bunlock\b/.test(q)) {
        return { matched: true, tier: 'T0_LOCAL', response: 'Door unlocked.', updates: locks.map(o => ({ id: o.id, changes: { isLocked: false } })) };
      }
      if (/\block\b/.test(q) && !/\bunlock\b/.test(q)) {
        return { matched: true, tier: 'T0_LOCAL', response: 'Door locked.', updates: locks.map(o => ({ id: o.id, changes: { isLocked: true } })) };
      }
    }
  }

  // ─── THERMOSTAT / AC (T1) ────────────────────────────────────────────────

  if (/\b(temperature|thermostat|ac|air\s*con(ditioner)?|aircon|cooling|heating)\b/.test(q)) {
    const thermos = byType(objects, 'thermostat');
    const tempN = q.match(/\b(\d{2})\s*(?:degrees?|deg|°|celsius|°c)?\b/);
    if (tempN) {
      const val = Math.min(30, Math.max(16, parseInt(tempN[1])));
      return { matched: true, tier: 'T1_LOCAL', response: `Temperature set to ${val}°C.`, updates: thermos.map(o => ({ id: o.id, changes: { temperature: val } })) };
    }
    if (/\b(up|hotter|warmer|increase|raise)\b/.test(q)) {
      return { matched: true, tier: 'T1_LOCAL', response: 'Temperature up 1°C.', updates: thermos.map(o => ({ id: o.id, changes: { temperature: Math.min(30, (o.alexaDeviceState.temperature ?? 22) + 1) } })) };
    }
    if (/\b(down|cooler|colder|decrease|lower)\b/.test(q)) {
      return { matched: true, tier: 'T1_LOCAL', response: 'Temperature down 1°C.', updates: thermos.map(o => ({ id: o.id, changes: { temperature: Math.max(16, (o.alexaDeviceState.temperature ?? 22) - 1) } })) };
    }
    if (action !== null) {
      return { matched: true, tier: 'T0_LOCAL', response: `AC ${action ? 'on' : 'off'}.`, updates: thermos.map(o => ({ id: o.id, changes: { isOn: action } })) };
    }
  }

  // ─── AIR PURIFIER (T0/T1) ────────────────────────────────────────────────

  if (/\b(air\s*purifier|purifier|air\s*filter|air\s*clean(er)?)\b/.test(q)) {
    const purifiers = byType(objects, 'air-purifier');
    const spd = q.match(/\bspeed\s+(?:to\s+)?(\d)\b/);
    if (spd) {
      const speed = Math.min(5, Math.max(1, parseInt(spd[1])));
      return { matched: true, tier: 'T1_LOCAL', response: `Purifier speed ${speed}.`, updates: purifiers.map(o => ({ id: o.id, changes: { speed } })) };
    }
    if (action !== null) {
      return { matched: true, tier: 'T0_LOCAL', response: `Air purifier ${action ? 'on' : 'off'}.`, updates: applyTo(objects, 'air-purifier', { isOn: action }) };
    }
  }

  // ─── STATUS QUERIES (T1) ─────────────────────────────────────────────────

  if (/\b(what'?s?\s+on|which\s+devices?\s+are\s+on|devices?\s+status|home\s+status|what\s+is\s+on)\b/.test(q)) {
    const on = objects.filter(o =>
      o.isAlexaDevice && o.alexaDeviceState.isOn &&
      !['camera', 'smoke-detector', 'motion-sensor', 'doorbell', 'echo-dot', 'echo-show'].includes(o.type)
    );
    if (on.length === 0) return { matched: true, tier: 'T1_LOCAL', response: 'All devices are off.', updates: [] };
    const names = on.map(o => `${o.deviceName} (${ROOM_LABEL[o.parentRoomId ?? ''] ?? o.parentRoomId})`).slice(0, 4);
    return { matched: true, tier: 'T1_LOCAL', response: `${on.length} on: ${names.join(', ')}.`, updates: [] };
  }

  if (/\bstatus\b/.test(q) && room !== null) {
    const roomDevices = objects.filter(o => o.isAlexaDevice && o.parentRoomId === room);
    const onCount = roomDevices.filter(o => o.alexaDeviceState.isOn).length;
    return {
      matched: true, tier: 'T1_LOCAL',
      response: `${ROOM_LABEL[room]}: ${onCount}/${roomDevices.length} devices on.`,
      roomFocus: room,
      updates: [],
    };
  }

  // ─── ROOM NAVIGATION (T0) ────────────────────────────────────────────────

  if (/\b(show|go\s+to|navigate\s+to|open|zoom\s*(in\s*to)?)\b/.test(q) && room !== null) {
    return { matched: true, tier: 'T0_LOCAL', response: `Showing ${ROOM_LABEL[room]}.`, roomFocus: room, updates: [] };
  }

  if (/\b(show\s+(all|full|home|house|overview)|full\s+view|home\s+view|all\s+rooms?|overview|house\s+view)\b/.test(q)) {
    return { matched: true, tier: 'T0_LOCAL', response: 'Showing full home.', roomFocus: null, updates: [] };
  }

  // ─── SINGLE DEVICE — match by deviceName substring (T1) ──────────────────

  if (action !== null) {
    const lowerRaw = raw.toLowerCase();
    for (const o of objects) {
      if (!o.isAlexaDevice) continue;
      if (lowerRaw.includes(o.deviceName.toLowerCase())) {
        return {
          matched: true, tier: 'T1_LOCAL',
          response: `${o.deviceName} ${action ? 'on' : 'off'}.`,
          roomFocus: o.parentRoomId,
          updates: [{ id: o.id, changes: { isOn: action } }],
        };
      }
    }
  }

  return unmatched;
}
