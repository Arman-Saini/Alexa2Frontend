// Natural, FREE text-to-speech for the Alexa+ demo.
//
// Strategy (honours "only use the network voice if it's quick"):
//   1. Try a free, no-key cloud TTS (Google Translate TTS, en-IN → Indian-English accent,
//      on-theme for Alexa+ India). Playback starts via an <audio> element. If it hasn't
//      actually started within a short budget, we abandon it.
//   2. Fallback: the best available browser SpeechSynthesis voice with warm prosody.
//
// Nothing requires an API key. The only network call is the optional Google TTS URL.

const CLOUD_LANG = 'en-IN'; // Indian-English accent , on-theme + natural
const CLOUD_MAX_CHARS = 200; // Google TTS caps query length; skip cloud for long text
const CLOUD_START_BUDGET_MS = 1600; // if playback hasn't begun by now, fall back

function cloudUrl(text: string): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${CLOUD_LANG}&q=${encodeURIComponent(text)}`;
}

let currentAudio: HTMLAudioElement | null = null;

function cancelAll() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
  } catch { /* noop */ }
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

// ── Best-available browser voice (offline fallback) ───────────────────────────
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const byName = (re: RegExp) => voices.find((v) => re.test(v.name));
  return (
    // Indian-English first (on-theme), then natural/neural, then macOS premium, then any en
    byName(/Aditi|Raveena|Veena|Rishi|Heera|Priya/i) ??
    voices.find((v) => /Neural|Natural|Online/i.test(v.name) && v.lang.startsWith('en')) ??
    byName(/Google US English|Google UK English Female/i) ??
    byName(/Ava|Allison|Samantha|Serena|Zoe|Karen|Moira|Tessa|Fiona/i) ?? // macOS premium
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]
  );
}

function browserSpeak(text: string) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.volume = 0.95;
  utter.rate = 0.98;   // a touch slower reads warmer, less robotic
  utter.pitch = 1.05;
  const apply = () => {
    const v = pickBrowserVoice();
    if (v) { utter.voice = v; utter.lang = v.lang; }
    else { utter.lang = 'en-IN'; }
    window.speechSynthesis.speak(utter);
  };
  if ((window.speechSynthesis.getVoices() ?? []).length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', apply, { once: true });
  } else {
    apply();
  }
}

/** Speak `text` with the most natural free voice available. */
export function speakNatural(text: string) {
  if (!text || typeof window === 'undefined') return;
  cancelAll();

  // Long responses exceed the Google TTS query cap , use the browser voice directly.
  if (text.length > CLOUD_MAX_CHARS) { browserSpeak(text); return; }

  // Attempt the natural cloud voice; bail to browser if it doesn't start quickly.
  try {
    const audio = new Audio(cloudUrl(text));
    audio.volume = 1.0;
    currentAudio = audio;

    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      if (currentAudio === audio) currentAudio = null;
      browserSpeak(text);
    };
    const timer = window.setTimeout(fallback, CLOUD_START_BUDGET_MS);

    audio.addEventListener('playing', () => { settled = true; window.clearTimeout(timer); }, { once: true });
    audio.addEventListener('error', () => { window.clearTimeout(timer); fallback(); }, { once: true });
    audio.play().catch(() => { window.clearTimeout(timer); fallback(); });
  } catch {
    browserSpeak(text);
  }
}

/** Stop any in-progress speech. */
export function stopSpeaking() {
  cancelAll();
}
