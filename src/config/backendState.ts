// Auto-detects which backend to use at runtime.
// Probes the deployed URL first; falls back to localhost if unreachable.
// All API consumers read `backendState.url` instead of env.BACKEND_URL directly.

import { env } from './env';

export type BackendSource = 'detecting' | 'cloud' | 'local' | 'offline';

export interface BackendState {
  url: string;
  source: BackendSource;
  isResolved: boolean;
}

const LOCALHOST = 'http://localhost:3001';

export const backendState: BackendState = {
  url: env.BACKEND_URL,   // optimistic start with configured URL
  source: 'detecting',
  isResolved: false,
};

const listeners: Array<() => void> = [];

export function onBackendResolved(cb: () => void) {
  if (backendState.isResolved) { cb(); return; }
  listeners.push(cb);
}

function notify() {
  listeners.splice(0).forEach(cb => cb());
}

async function tryHealth(url: string, timeoutMs: number): Promise<boolean> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/api/health`, { signal: ac.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBackendUrl(): Promise<void> {
  const primary = env.BACKEND_URL;

  if (primary === LOCALHOST) {
    // Dev environment , only check localhost
    const alive = await tryHealth(LOCALHOST, 2000);
    backendState.url = LOCALHOST;
    backendState.source = alive ? 'local' : 'offline';
    backendState.isResolved = true;
    notify();
    return;
  }

  // Try deployed backend first (3.5s window)
  const cloudAlive = await tryHealth(primary, 3500);
  if (cloudAlive) {
    backendState.url = primary;
    backendState.source = 'cloud';
    backendState.isResolved = true;
    notify();
    return;
  }

  // Deployed is down , fall back to localhost
  const localAlive = await tryHealth(LOCALHOST, 1500);
  backendState.url = localAlive ? LOCALHOST : primary;
  backendState.source = localAlive ? 'local' : 'offline';
  backendState.isResolved = true;
  notify();
}

// Start probing as soon as this module is imported
resolveBackendUrl();
