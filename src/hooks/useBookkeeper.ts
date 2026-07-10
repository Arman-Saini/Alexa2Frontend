// Khata (Bookkeeper) data hook , logs Hinglish vendor utterances, keeps the
// monthly ledger fetched/refetchable, and triggers settlement.

import { useState, useCallback, useEffect } from 'react';
import {
  khataApi,
  type KhataLedgerResponse,
  type KhataLogResponse,
  type KhataSettleResponse,
} from '../api/khataApi';
import { ApiError } from '../api/client';
import { useWebSocket } from './useWebSocket';

export interface UseBookkeeper {
  ledger: KhataLedgerResponse | null;
  loading: boolean;
  error: string | null;
  logEntry: (utterance: string) => Promise<KhataLogResponse>;
  refetchLedger: () => Promise<void>;
  settle: () => Promise<KhataSettleResponse>;
  resetLedger: () => Promise<void>;
}

export function useBookkeeper(): UseBookkeeper {
  const [ledger, setLedger] = useState<KhataLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await khataApi.getLedger();
      setLedger(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetchLedger(); }, [refetchLedger]);

  const logEntry = useCallback(async (utterance: string): Promise<KhataLogResponse> => {
    const result = await khataApi.log(utterance);
    await refetchLedger();
    return result;
  }, [refetchLedger]);

  const settle = useCallback((): Promise<KhataSettleResponse> => {
    return khataApi.settle();
  }, []);

  const resetLedger = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await khataApi.reset();
      await refetchLedger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset ledger.');
    } finally {
      setLoading(false);
    }
  }, [refetchLedger]);

  const { subscribe } = useWebSocket();
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'khata_entry') {
        void refetchLedger();
      }
    });
    return unsubscribe;
  }, [subscribe, refetchLedger]);

  return { ledger, loading, error, logEntry, refetchLedger, settle, resetLedger };
}
