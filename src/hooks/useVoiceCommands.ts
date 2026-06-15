// Local voice command interpreter â€” NO backend required for understanding.
// Matches transcript â†’ tier + hardcoded response + optional action.
// Backend scenario/simulate calls are fire-and-forget (failures don't block TTS).

export type CommandTier = 'T0' | 'T1' | 'T2' | 'T3';
export type CommandAction =
  | { type: 'scenario'; id: string }
  | { type: 'regime';   value: string }
  | { type: 'info' }
  | { type: 'greeting' };

export interface CommandResult {
  matched:    boolean;
  transcript: string;
  tier:       CommandTier;
  response:   string;
  action?:    CommandAction;
}

interface Rule {
  patterns: RegExp[];
  tier:     CommandTier;
  response: string | ((t: string) => string);
  action?:  CommandAction;
}

// â”€â”€ Command table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each entry: patterns (any match wins), tier, response, optional action.

const RULES: Rule[] = [

  // â”€â”€ Greetings & help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i,
               /\balexa\b/i],
    tier: 'T0',
    response: () => {
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return `${greet}! I'm Alexa. I'm monitoring your home. Say a command or click a scenario to get started.`;
    },
    action: { type: 'greeting' },
  },
  {
    patterns: [/what can you do|help|what do you know|commands/i],
    tier: 'T0',
    response: 'I can control lights, fans, AC, geyser, and door locks. I can detect jeera burning, pressure cooker whistles, power cuts, and more. Say something like: turn on the lights, I\'m leaving, jeera is burning, or switch to sleep mode.',
    action: { type: 'info' },
  },
  {
    patterns: [/thank you|thanks|great|awesome|perfect|well done/i],
    tier: 'T0',
    response: 'You\'re welcome! Is there anything else I can help with?',
    action: { type: 'greeting' },
  },

  // â”€â”€ Lights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/turn on (all |the )?lights?|lights? on|switch on (the )?lights?|illuminate/i],
    tier: 'T0',
    response: 'Turning on all lights. Done. 3 lights activated.',
    action: { type: 'info' },
  },
  {
    patterns: [/turn off (all |the )?lights?|lights? off|switch off (the )?lights?/i],
    tier: 'T0',
    response: 'Turning off all lights. The house is now dark.',
    action: { type: 'info' },
  },
  {
    patterns: [/dim (the )?lights?|lights? dim|low light/i],
    tier: 'T1',
    response: 'Dimming all lights to 30 percent. Comfortable for evening.',
    action: { type: 'info' },
  },
  {
    patterns: [/kitchen (lights?|on|off)|lights? (in |for )?kitchen/i],
    tier: 'T0',
    response: 'Kitchen light toggled.',
    action: { type: 'info' },
  },
  {
    patterns: [/bedroom (lights?)|lights? (in |for )?bedroom/i],
    tier: 'T0',
    response: 'Bedroom light toggled.',
    action: { type: 'info' },
  },

  // â”€â”€ Fan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/turn on (the )?fan|fan on|start (the )?fan|ceiling fan on/i],
    tier: 'T0',
    response: 'Ceiling fan is now on at speed 3.',
    action: { type: 'info' },
  },
  {
    patterns: [/turn off (the )?fan|fan off|stop (the )?fan/i],
    tier: 'T0',
    response: 'Fan switched off.',
    action: { type: 'info' },
  },
  {
    patterns: [/fan speed (up|down|high|low|max|min|\d)/i],
    tier: 'T0',
    response: (t) => {
      const m = t.match(/\b(up|down|high|low|max|min|\d)\b/i);
      return `Fan speed set to ${m?.[1] ?? 'medium'}.`;
    },
    action: { type: 'info' },
  },

  // â”€â”€ AC / Air Conditioner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/turn on (the )?(ac|air con|air conditioner|cooling)|ac on/i],
    tier: 'T0',
    response: 'Air conditioner is on. Set to 24 degrees Celsius.',
    action: { type: 'info' },
  },
  {
    patterns: [/turn off (the )?(ac|air con|air conditioner)|ac off/i],
    tier: 'T0',
    response: 'Air conditioner switched off.',
    action: { type: 'info' },
  },
  {
    patterns: [/set (the )?(temperature|temp|ac|thermostat) (to )?(\d+)/i],
    tier: 'T1',
    response: (t) => {
      const m = t.match(/(\d+)/);
      const temp = m ? parseInt(m[1]) : 24;
      const note = temp < 18 ? 'That\'s quite cold â€” I\'ve noted it.' : temp > 28 ? 'That\'s warm. Are you sure?' : 'Done.';
      return `Temperature set to ${temp} degrees Celsius. ${note}`;
    },
    action: { type: 'info' },
  },

  // â”€â”€ Geyser / Water Heater â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/turn on (the )?geyser|geyser on|hot water on|start (the )?geyser/i],
    tier: 'T0',
    response: 'Geyser on kar diya hai. Pani garam ho jayega , main alert kar dunga jab ready ho jaye.',
    action: { type: 'scenario', id: 'geyser' },
  },
  {
    patterns: [/geyser (too long|running|check|off)|turn off geyser|hot water off/i],
    tier: 'T0',
    response: 'Geyser kaafi der se on tha. Safety ke liye maine abhi band kar diya hai. Pani garam ho chuka hai.',
    action: { type: 'scenario', id: 'geyser' },
  },
  {
    patterns: [/geyser/i],
    tier: 'T0',
    response: 'Geyser theek chal raha hai. Koi issue nahi.',
    action: { type: 'scenario', id: 'geyser' },
  },

  // â”€â”€ Door Lock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/lock (the )?door|door locked|secure (the )?house/i],
    tier: 'T0',
    response: 'Front door locked. All entry points are secure.',
    action: { type: 'info' },
  },
  {
    patterns: [/unlock (the )?door/i],
    tier: 'T0',
    response: 'Front door unlocked. Someone is expected?',
    action: { type: 'info' },
  },

  // â”€â”€ Scenarios â€” Kitchen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/jeera|oil (too |is )?hot|something (is )?burning|kitchen smell|smoke in kitchen|oil burn/i],
    tier: 'T1',
    response: 'Alert! I detected a frequency spike at 800 hertz in the kitchen. This means the oil is too hot before adding jeera. T1 edge machine learning caught this in under 80 milliseconds. Notifying you now â€” please reduce the flame.',
    action: { type: 'scenario', id: 'jeera' },
  },
  {
    patterns: [/pressure cooker|cooker (done|whistle|ready)|whistle|dal (is )?done|rice (is )?done|whistle count/i],
    tier: 'T0',
    response: 'Pressure cooker whistle detected. That is whistle number 3. A T0 reflex rule has automatically dialled down the gas burner. Your dal is ready. This took under 10 milliseconds.',
    action: { type: 'scenario', id: 'pressure' },
  },

  // â”€â”€ Scenarios â€” Power â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/power cut|electricity (is )?gone|lights? (went |are )?off|power failure|power outage|no power|power loss/i],
    tier: 'T0',
    response: 'Grid power lost. I have switched to inverter instantly using a T0 fail-safe rule. No internet was needed. A 45-minute dead-man timer is set for the water motor. All critical devices are protected.',
    action: { type: 'scenario', id: 'grid' },
  },
  {
    patterns: [/power is back|electricity back|power restored|lights back/i],
    tier: 'T0',
    response: 'Grid power restored. Switching back from inverter to grid supply. All devices resuming normal operation.',
    action: { type: 'info' },
  },

  // â”€â”€ Scenarios â€” Morning / Pooja â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/pooja|morning prayer|prayer time|devotional|6 a\.?m\.?|morning routine|puja/i],
    tier: 'T2',
    response: 'Good morning. It is 6 AM. I am shifting the home to devotional regime using a T2 temporal guardrail. Warm lights are on, bhajans have started quietly, and all alerts are muted until 8 AM.',
    action: { type: 'scenario', id: 'pooja' },
  },

  // â”€â”€ Scenarios â€” Away â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/i('?m| am) (leaving|going out|going away)|bye|leaving (the )?house|going home|away mode start/i],
    tier: 'T3',
    response: 'You left the geofence. But I detect a Bluetooth signature matching your dog still in the living room. This required T3 Bedrock because it needed to fuse geofence data, BLE sensors, and the home camera simultaneously. LPG and water motor are now secured. Should I keep the air conditioner on for him?',
    action: { type: 'scenario', id: 'away' },
  },
  {
    patterns: [/i('?m| am) back|i have returned|coming home/i],
    tier: 'T0',
    response: 'Welcome back, Sharma Ji! Disabling away mode. Checking weather conditions for your comfort , I\'ll suggest adjustments now.',
    action: { type: 'scenario', id: 'guest_doorbell' },
  },

  // ── Weather-aware comfort ──────────────────────────────────────────────────

  {
    patterns: [/it('?s| is) (hot|warm|burning|sweltering|humid)|too hot outside/i],
    tier: 'T1',
    response: 'I see it\'s hot outside. Turning on AC at 24°C and fan at speed 3. Stay cool , hydrate karo!',
    action: { type: 'info' },
  },
  {
    patterns: [/it('?s| is) (cold|chilly|cool|raining|rainy)|too cold outside/i],
    tier: 'T0',
    response: 'Cold weather detected! AC off, fan at speed 1. Geyser warming up for you , chai bhi ban rahi hai.',
    action: { type: 'info' },
  },

  // â”€â”€ Regime changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/sleep mode|good ?night|night mode|bedtime/i],
    tier: 'T2',
    response: 'Switching to sleep mode. All lights off except the corridor nightlight. AC set to 26 degrees. Alerts muted until 6 AM. Sleep well.',
    action: { type: 'regime', value: 'sleep' },
  },
  {
    patterns: [/festival mode|celebration mode|diwali|holi|party mode|festive/i],
    tier: 'T2',
    response: 'Switching to festival mode! All lights at full brightness and warm colour. Sounds and notifications are on. Enjoy the celebration!',
    action: { type: 'regime', value: 'festival' },
  },
  {
    patterns: [/guest mode|someone is coming|guests? (are )?(coming|here)|visitors?/i],
    tier: 'T2',
    response: 'Switching to guest mode. Guest room lights and AC are on. Front door camera is active. All personal routines are paused.',
    action: { type: 'regime', value: 'guest' },
  },
  {
    patterns: [/normal mode|regular mode|reset mode|default mode/i],
    tier: 'T0',
    response: 'Switching to normal mode. All devices at their default settings.',
    action: { type: 'regime', value: 'normal' },
  },

  // â”€â”€ Status & Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/what (time|is the time)|current time/i],
    tier: 'T0',
    response: () => {
      const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `The current time is ${t}.`;
    },
    action: { type: 'info' },
  },
  {
    patterns: [/what('?s| is) (the |my )?(current )?(regime|mode|home mode)/i],
    tier: 'T0',
    response: 'I\'ll check the current home regime. It should be visible in the header at the top of the dashboard.',
    action: { type: 'info' },
  },
  {
    patterns: [/how many devices|device (count|status|list)|devices (are |are )?on/i],
    tier: 'T1',
    response: 'Your home has 15 registered devices. 12 are currently online. 6 are actively consuming power. Check the Devices tab for the full list.',
    action: { type: 'info' },
  },
  {
    patterns: [/lpg|gas (level|check|low)|cooking gas/i],
    tier: 'T0',
    response: 'LPG cylinder is at 38 percent. At your usual cooking rate, you have approximately 12 days of gas remaining. Should I add a refill reminder?',
    action: { type: 'info' },
  },
  {
    patterns: [/water (level|motor|pump|tank)/i],
    tier: 'T0',
    response: 'Water tank is at 72 percent. Motor is running normally. No anomalies detected.',
    action: { type: 'info' },
  },
  {
    patterns: [/inverter|battery|ups|backup power/i],
    tier: 'T0',
    response: 'Inverter battery is at 91 percent charge. Currently on grid supply. In case of power failure, it can provide up to 6 hours of backup.',
    action: { type: 'info' },
  },
  {
    patterns: [/status|home report|summary|how is (the )?home|everything (ok|fine|good)/i],
    tier: 'T1',
    response: 'Home status: All systems normal. 12 of 15 devices online. LPG at 38 percent. Water tank at 72 percent. Inverter at 91 percent. No active alerts. Regime is normal.',
    action: { type: 'info' },
  },

  // â”€â”€ Night safety â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  {
    patterns: [/night safety|safety check|secure (the )?home|check everything/i],
    tier: 'T1',
    response: 'Running night safety check. Front door: locked. Gas valve: closed. Water motor: off. All windows: closed. Geyser: off. You are safe to sleep.',
    action: { type: 'scenario', id: 'pressure' },
  },

];

// â”€â”€ Fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FALLBACK: CommandResult = {
  matched:    false,
  transcript: '',
  tier:       'T3',
  response:   '', // filled in by interpretCommand
};

// â”€â”€ Interpreter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function interpretCommand(transcript: string): CommandResult {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return { ...FALLBACK, response: 'I didn\'t catch that. Could you try again?' };

  for (const rule of RULES) {
    const matched = rule.patterns.some(p => p.test(lower));
    if (!matched) continue;

    const response = typeof rule.response === 'function'
      ? rule.response(lower)
      : rule.response;

    return {
      matched:    true,
      transcript,
      tier:       rule.tier,
      response,
      action:     rule.action,
    };
  }

  // Nothing matched
  return {
    matched:    false,
    transcript,
    tier:       'T3',
    response:   `I heard "${transcript}". I'm not sure how to handle that yet. Try saying: turn on the lights, I'm leaving, jeera is burning, or status report.`,
  };
}

