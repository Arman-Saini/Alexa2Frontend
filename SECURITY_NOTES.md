# Security Notes — Alexa+ Digital Twin (frontend)

A pragmatic review of the trust/safety surface of this demo. This is the **frontend** repo;
the backend (tiered T0/T1/T3 + Bedrock) lives in a separate repo and is referenced where relevant.

## 1. Local command path is safe by construction
- Known voice/text commands are resolved **locally** by `src/store/commandProcessor.ts`
  (`processCommand`) and only mutate **in-memory demo state** in the Zustand store
  (`src/store/store.ts`). No real device APIs, no network calls, no shell/eval.
- There is no `eval`/`Function`/`dangerouslySetInnerHTML` driven by user input in the command
  path. Utterances are matched against fixed regex patterns, not executed.
- Worst case for a malicious utterance offline: it toggles a simulated device or shows a
  fallback message. No real-world action is possible from the local path.

## 2. Backend path (optional augment)
- When a live backend is reachable, unmatched commands are forwarded via `src/api/client.ts`
  to the T0→T1→T3 cascade. The frontend sends an **anonymised** event payload
  (`{event, room}`) — no raw audio, no PII (see `PrivacyDrawer`).
- **Recommendation (backend):** every actuation tool (e.g. `actuate_home_device`,
  `order_amazon_now`) MUST pass an authorization/affordability gate **before** execution
  (the architecture's `authorizer.ts` / financial-safety layer). Confirm this is enforced on
  the server, not just the client — the client must never be the only gate.

## 3. Prompt-injection surface (T3 / Bedrock)
- User utterances ultimately reach the LLM. Treat them as untrusted:
  - Keep tool schemas strict (enumerated device ids/actions; reject free-form targets).
  - Never let model output trigger purchases/unlocks without the auth gate + a user
    confirmation step (the demo already gates destructive scenario actions behind a
    "Should I …?" confirm).
  - Cap spend/rate per home; log every tool call.

## 4. Third-party calls from the frontend
- **TTS:** `src/utils/voice.ts` may send the **response text** to Google Translate TTS
  (no API key, no PII beyond the spoken sentence) and falls back to on-device speech if it
  doesn't respond quickly. Acceptable for a demo; for production use an owned TTS endpoint.
- **Assets/HDRI:** bundled locally under `public/`; nothing hot-linked at runtime.

## 5. General hardening recommendations
- Serve over HTTPS; set a strict CSP (the only external origins needed are the chosen TTS +
  the backend API).
- Validate/escape any device names a user can type (Inspector panel) before rendering.
- Rate-limit backend mutation endpoints; require auth for device control in production.
