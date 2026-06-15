import { useEffect, useState } from 'react';
import { backendState, onBackendResolved } from '../config/backendState';

// Reactive flag: is a live backend reachable (cloud or local)? Panels that depend on the
// backend use this to disable their actions + show a clear notice when running offline,
// so no control looks "dead" in the local demo.
export function useBackendOnline(): boolean {
  const isOnline = () => backendState.source === 'cloud' || backendState.source === 'local';
  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    onBackendResolved(() => setOnline(isOnline()));
  }, []);
  return online;
}
