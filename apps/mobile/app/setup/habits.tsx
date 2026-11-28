import { router } from "expo-router";
import { useState } from "react";
import { STARTER_HABITS } from "@inn/content";
import { DEFAULT_TUNING, habitSlots } from "@inn/engine";
import { addStarterHabit } from "../../src/data/api.ts";
import { describeGoal } from "../../src/game/board.ts";
import { useAction, useSession } from "../../src/session.tsx";
import { Body, Button, Card, ErrorText, Screen, Title, useTheme } from "../../src/ui.tsx";

export default function StarterHabits() {
  const t = useTheme();
  const { player, today, changed } = useSession();
  const slots = player ? habitSlots(player.started_on, today, DEFAULT_TUNING) : 0;
  const [picked, setPicked] = useState<string[]>(STARTER_HABITS.slice(0, slots).map((s) => s.id));
  const { busy, error, run } = useAction();
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < slots ? [...p, id] : p));

  return (
    <Screen>
      <Title sub={`Step 4 of 4. Up to ${slots} habits at first; more open after week 2.`}>Starting habits</Title>
      {STARTER_HABITS.map((s) => {
        const on = picked.includes(s.id);
        return (
          <Card key={s.id} onPress={() => toggle(s.id)}>
            <Body style={{ fontWeight: "700", color: on ? t.accent : t.text }}>
              {on ? "✓ " : ""}
              {s.name}
            </Body>
            <Body muted>
              {describeGoal({ ...s.goal, habitId: s.id, startDate: today })}
              {s.healthType ? " · from Apple Health" : ""} · tiny version: {s.tinyVersion}
            </Body>
          </Card>
        );
      })}
      <Body muted style={{ marginVertical: 8 }}>You can add your own habits and change goals any time on the Habits tab.</Body>
      <Button
        label={picked.length ? `Start with ${picked.length} habits` : "Skip for now"}
        busy={busy}
        onPress={() =>
          run(async () => {
            for (const s of STARTER_HABITS.filter((x) => picked.includes(x.id))) await addStarterHabit(s, today);
            changed();
            router.replace("/today");
          })
        }
      />
      <ErrorText error={error} />
    </Screen>
  );
}
