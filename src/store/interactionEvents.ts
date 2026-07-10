// Tiny synchronous event bus decoupling interaction producers (room clicks,
// device clicks, voice commands, avatar clicks) from consumers (dialogue,
// lighting, audio, animation) — see useInteractionEffects.ts for the single
// subscriber that fans these out. Deliberately not a generic pub/sub lib: one
// Set of handlers, each switches on event.type. Revisit only if the event
// count outgrows a single readable switch.
export type InteractionEvent =
  | { type: 'room:focus'; roomId: string }
  | { type: 'room:blur'; roomId: string }
  | { type: 'object:toggle'; objectId: string; objectType: string; isOn: boolean }
  | { type: 'vacuum:patrol'; roomId: string | null }
  | { type: 'easter-egg:dance-party' }
  | { type: 'easter-egg:avatar-tickle' };

type Handler = (event: InteractionEvent) => void;

const handlers = new Set<Handler>();

export function onInteraction(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function emitInteraction(event: InteractionEvent): void {
  for (const h of handlers) h(event);
}
