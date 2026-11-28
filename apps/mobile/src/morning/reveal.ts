import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import type { LocalDate } from "@inn/schema";
import { listMornings } from "../data/api.ts";
import { shouldReveal } from "../game/morning.ts";
import { useSession } from "../session.tsx";

const key = (playerId: string) => `inn.morningSeen.${playerId}`;

export async function lastSeenMorning(playerId: string): Promise<LocalDate | null> {
  try {
    return (await AsyncStorage.getItem(key(playerId))) as LocalDate | null;
  } catch {
    return null;
  }
}

export async function markMorningSeen(playerId: string, date: LocalDate): Promise<void> {
  try {
    await AsyncStorage.setItem(key(playerId), date);
  } catch {
    // Showing it twice is fine.
  }
}

/** Opens the morning reveal the first time this phone sees a new morning. */
export function useMorningReveal(): void {
  const { player, today, version } = useSession();
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!player) return;
    let live = true;
    void (async () => {
      const [latest] = await listMornings(1).catch(() => []);
      const seen = await lastSeenMorning(player.id);
      if (!live || !latest || opened.current === latest.date || !shouldReveal(latest.date, seen, today)) return;
      opened.current = latest.date;
      router.push("/morning");
    })();
    return () => {
      live = false;
    };
  }, [player?.id, today, version]);
}
