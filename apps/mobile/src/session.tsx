import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { gameDate, systemClock } from "@inn/engine";
import type { LocalDate } from "@inn/schema";
import { getHousehold, getMe, type Player } from "./data/api.ts";
import { supabase } from "./lib/supabase.ts";

interface SessionState {
  ready: boolean;
  session: Session | null;
  player: Player | null;
  household: { id: string; name: string } | null;
  /** Today's game day for the signed-in player (days roll over at 4:00 local). */
  today: LocalDate;
  /** Re-read the player and house after a change. */
  refresh: () => Promise<void>;
  /** Bumped after any write, so screens re-load their data. */
  version: number;
  changed: () => void;
}

const Ctx = createContext<SessionState | null>(null);

export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s === null) {
      setPlayer(null);
      setHousehold(null);
    } else {
      const me = await getMe(s.user.id);
      setPlayer(me);
      setHousehold(me?.household_id ? await getHousehold() : null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      void load(s);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
    setVersion((v) => v + 1);
  }, [load]);

  const changed = useCallback(() => setVersion((v) => v + 1), []);
  const today = gameDate(systemClock, player?.time_zone ?? deviceTimeZone());

  return (
    <Ctx.Provider value={{ ready, session, player, household, today, refresh, version, changed }}>{children}</Ctx.Provider>
  );
}

export function useSession(): SessionState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

/** Loads data with `fn`, re-running when `deps` or the session version change. */
export function useData<T>(fn: () => Promise<T>, deps: readonly unknown[] = []) {
  const { version } = useSession();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fn().then(
      (d) => live && (setData(d), setError(null)),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [version, ...deps]);
  return { data, error };
}

/** Wraps an async action with busy/error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run };
}
