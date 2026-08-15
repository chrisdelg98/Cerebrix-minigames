import { useCallback, useEffect, useState } from 'react';

import { type GlobalStats, type SavedSession } from '@storage/index';

import { useStorage } from '../storageContext';

/**
 * Home's read-only view of what is in storage: which games have something to
 * continue, and the totals across all of them.
 *
 * Both expose `refresh` because the data changes from outside React — finishing
 * a game, importing a backup — and polling for that would be worse than asking.
 */

export function useSavedSessions(): {
  sessions: Record<string, SavedSession>;
  loading: boolean;
  refresh: () => void;
} {
  const storage = useStorage();
  const [sessions, setSessions] = useState<Record<string, SavedSession>>({});
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    storage
      .listSessions()
      .then((list) => {
        if (cancelled) return;
        setSessions(Object.fromEntries(list.map((session) => [session.gameId, session])));
        setLoading(false);
      })
      .catch(() => {
        // Storage being unavailable must not stop Home from rendering: the
        // games are all still playable, they just cannot be continued.
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storage, nonce]);

  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  return { sessions, loading, refresh };
}

export function useGlobalStats(): { stats: GlobalStats | null; refresh: () => void } {
  const storage = useStorage();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    storage
      .getGlobalStats()
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [storage, nonce]);

  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  return { stats, refresh };
}
