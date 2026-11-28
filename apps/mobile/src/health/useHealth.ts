import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { HabitInfo } from "@inn/schema/rows";
import { askPermission, healthAvailable, needsPermission, saveTestRide } from "./healthkit.ts";
import { syncHealth, type SyncResult } from "./sync.ts";

export interface HealthState {
  /** This player has habits that come from Apple Health. */
  wanted: boolean;
  available: boolean;
  /** iOS still has to ask. */
  needsPermission: boolean;
  syncing: boolean;
  last?: SyncResult;
  error?: string;
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  /** Development builds only. */
  addTestRide?: (minutes: number) => Promise<void>;
}

/**
 * Keeps Apple Health logs current: syncs when the screen comes into view and when the app
 * returns to the foreground, once permission has been asked. Calls `onChanged` only when
 * logs were added or removed, so screens reload without looping.
 */
export function useHealth(playerId: string | undefined, timeZone: string | undefined, habits: readonly HabitInfo[] | undefined, today: string, onChanged: () => void): HealthState {
  const wanted = (habits ?? []).some((h) => h.playerId === playerId && h.healthType && h.archivedOn === undefined);
  const available = healthAvailable();
  const [ask, setAsk] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [last, setLast] = useState<SyncResult>();
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  const inputs = useRef({ playerId, timeZone, habits, today, onChanged });
  inputs.current = { playerId, timeZone, habits, today, onChanged };

  const sync = useCallback(async () => {
    const { playerId: id, timeZone: tz, habits: hs, today: d, onChanged: changed } = inputs.current;
    if (!id || !tz || !hs || !available || busy.current) return;
    if (!hs.some((h) => h.playerId === id && h.healthType)) return;
    busy.current = true;
    setSyncing(true);
    try {
      if (await needsPermission()) {
        setAsk(true);
        return;
      }
      setAsk(false);
      const r = await syncHealth(id, tz, hs, d);
      setLast(r);
      setError(undefined);
      if (r.added + r.removed > 0) changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [available]);

  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );
  // The habits arrive after the first focus; sync once they're here.
  useEffect(() => {
    if (wanted) void sync();
  }, [wanted, sync]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void sync());
    return () => sub.remove();
  }, [sync]);

  const connect = useCallback(async () => {
    try {
      await askPermission();
      setAsk(false);
      await sync();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sync]);

  return {
    wanted,
    available,
    needsPermission: ask,
    syncing,
    ...(last ? { last } : {}),
    ...(error ? { error } : {}),
    connect,
    sync,
    ...(__DEV__ ? { addTestRide: async (m: number) => (await saveTestRide(m), await sync()) } : {}),
  };
}
