// Orchestrates the "Act" choreography: rest -> voice command -> X-ray ->
// (later, a gsap timeline hands off to) the lens panel, OR rest -> unresolved
// command -> Bedrock scenario plan -> Act 3.
//
// This hook does NOT build the X-ray -> lens gsap timeline itself (that's a
// separate, not-yet-built ticket) , it only calls `actStore.triggerXray` /
// `goToAct` so that ticket has something to hook its `onComplete` into.
//
// Local command resolution reuses the store's existing `runLocalCommand`,
// which already wraps commandProcessor.ts and is the only code path in this
// app that actually resolves a transcript today (DigitalTwinCanvas is the
// current, and only, caller). useVoiceCommands.ts's `interpretCommand` and
// useMic.ts are not wired to anything at the moment, so there is nothing to
// hook into there , the integration point for "successful local voice
// command resolution" is `useAppStore.getState().runLocalCommand`.

import { useCallback, useEffect } from 'react';
import { useAppStore } from '../store/store';
import { useActStore } from '../store/actStore';
import { useEventStream, type WsMessage } from './useEventStream';
import { useScenarioPlan } from './useScenarioPlan';
import type { CommandResult } from '../store/commandProcessor';

export interface UseActSequencer {
  /** Feed a resolved voice transcript through the local resolver, falling
   *  back to a Bedrock scenario plan when nothing matches locally. */
  submitTranscript: (text: string) => Promise<CommandResult>;
  scenarioLoading: boolean;
  scenarioError: string | null;
}

function extractDeviceId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const p = payload as Record<string, unknown>;
  return typeof p.device_id === 'string' ? p.device_id : undefined;
}

export function useActSequencer(): UseActSequencer {
  const { onMessage } = useEventStream();
  const { loading: scenarioLoading, error: scenarioError, requestPlan } = useScenarioPlan();

  // Ambient backend-driven events (device changed itself via a rule, another
  // client's command, etc) also deserve the X-ray treatment on this client.
  useEffect(() => {
    return onMessage((msg: WsMessage) => {
      if (msg.type !== 'event_result' && msg.type !== 'device_update') return;
      const deviceId = extractDeviceId(msg.payload);
      if (deviceId) {
        useActStore.getState().triggerXray(deviceId);
      }
    });
  }, [onMessage]);

  const submitTranscript = useCallback(async (text: string): Promise<CommandResult> => {
    const result = useAppStore.getState().runLocalCommand(text);

    if (result.matched) {
      // Prefer the device(s) actually changed; fall back to the room the
      // command navigated to.
      const targetId = result.updates[0]?.id ?? result.roomFocus ?? undefined;
      if (targetId) {
        useActStore.getState().triggerXray(targetId);
      }
      return result;
    }

    // Nothing matched locally , ask Bedrock for the richer explanation and
    // move to Act 3 once it comes back.
    try {
      await requestPlan(text);
      useActStore.getState().goToAct(3, { scenarioText: text });
    } catch {
      // useScenarioPlan already captured the error in its own state; leave
      // the user on their current act rather than navigating on failure.
    }

    return result;
  }, [requestPlan]);

  return { submitTranscript, scenarioLoading, scenarioError };
}
