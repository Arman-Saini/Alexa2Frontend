// Groq LLM , free tier, ~200ms responses, OpenAI-compatible API.
// Set VITE_GROQ_API_KEY in .env to enable.
// Falls back to hardcoded commands if key is missing.
// Free limits: 14,400 req/day, 6,000 tokens/min on llama-3.1-8b-instant.

import type { WeatherInfo } from './useWeather';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL        = 'llama-3.1-8b-instant'; // fastest free model on Groq

const SYSTEM_PROMPT = `You are Alexa+, an AI assistant for an Indian smart home digital twin demo.

CONTEXT , This system (Alexa+ India Smart Home) demonstrates:
- A real smart home backend (alexa-back) running on Node.js at localhost:3001
- A 3D interactive digital twin of a typical Indian home (kitchen, bathroom, living room, master bedroom, office, pooja room)
- T0/T1/T2/T3 compute cascade: T0 = local reflex rules (<10ms, $0), T1 = edge ML (<80ms, $0), T2 = local SLM (<300ms, $0), T3 = AWS Bedrock cloud (~1s, ~$0.00006)
- Devices: fan, light, geyser, water pump, LPG sensor, AC, inverter, door lock, pressure cooker monitor
- Scenarios: jeera burning (T1), pressure cooker whistle (T0), grid failure (T0), 6AM pooja mode (T2), geyser anomaly (T0), away mode with pet detection (T3)
- STM vault (short-term memory, last 12 events) + LTM vault (long-term patterns, 90 days)
- Rule miner: T3 events get promoted to T0 rules over time (learning)
- Indian context: dal on gas, pressure cooker, jeera tempering, LPG cylinder, water motor, power cuts, pooja room, inverter/UPS

MULTI-AGENT ARCHITECTURE:
You coordinate 3 sub-agents: HomeState (device status + rule chain), WeatherAgent (ambient conditions + humidity), SafetyAgent (anomaly detection + LPG/smoke/motion). When the user returns home, proactively suggest comfort adjustments based on current weather conditions.

INSTRUCTIONS:
- You are the voice of Alexa speaking to the homeowner
- Keep responses under 2 sentences (for TTS , short is better)
- Be specific about which tier handled the request (T0/T1/T2/T3) when relevant
- Reference Indian home context naturally (geyser, LPG, pressure cooker, pooja, etc.)
- For unknown commands: suggest 2-3 things the user can try
- Be warm, slightly humorous, and helpful
- If asked about yourself: explain you are Alexa+ India, powered by a 4-tier compute cascade with 3 sub-agents
- Respond ONLY with the spoken response , no quotes, no tier prefix labels`;

export interface GroqResult {
  response: string;
  fromLLM:  boolean;
}

export async function askGroq(transcript: string, weather?: WeatherInfo | null): Promise<GroqResult> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) {
    return { response: '', fromLLM: false };
  }

  try {
    const weatherContext = weather
      ? `\nCURRENT CONDITIONS: ${weather.temp_c}°C, ${weather.desc} in ${weather.city}. Humidity: ${weather.humidity}%.`
      : '';
    const systemContent = SYSTEM_PROMPT + weatherContext;

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user',   content: transcript },
        ],
        max_tokens:  120,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { response: '', fromLLM: false };
    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return { response: text, fromLLM: true };
  } catch {
    return { response: '', fromLLM: false };
  }
}
