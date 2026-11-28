import { View } from "react-native";
import { CLASS_PATHS } from "@inn/content";
import { DEFAULT_TUNING } from "@inn/engine";
import { addLog, listGoals, listHabits, listHousemates, listLogs, listMyPauses, removeLog } from "../../src/data/api.ts";
import { buildBoard, describeGoal, logWindowStart, percent, type HabitCard } from "../../src/game/board.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, ErrorText, Heading, Row, Screen, Title, useTheme } from "../../src/ui.tsx";

export default function Today() {
  const { player, today, changed } = useSession();
  const from = logWindowStart(today, DEFAULT_TUNING);
  const { data, error } = useData(
    async () => {
      const [habits, goals, pauses, logs, people] = await Promise.all([listHabits(), listGoals(), listMyPauses(), listLogs(from, today), listHousemates()]);
      return { habits, goals, pauses, logs, people };
    },
    [from, today],
  );
  const action = useAction();
  if (!player) return null;

  const mine = data ? buildBoard(today, data.habits.filter((h) => h.playerId === player.id), data.goals, data.pauses, data.logs.filter((l) => l.playerId === player.id), DEFAULT_TUNING) : [];
  const path = CLASS_PATHS.find((p) => p.id === player.class_path_id);
  const partners = data?.people.filter((p) => p.id !== player.id) ?? [];

  const log = (card: HabitCard, kind: "full" | "tiny") =>
    action.run(async () => {
      await addLog({ habitId: card.habit.id, date: today, kind, source: "tap" });
      changed();
    });
  const undo = (id: string) => action.run(async () => (await removeLog(id), changed()));

  return (
    <Screen>
      <Title sub={`${path?.name ?? ""} · ${today} · logs stay open until you sleep`}>Today</Title>
      <ErrorText error={error ?? action.error} />
      {mine.length === 0 && data ? <Body muted>No habits yet. Add some on the Habits tab.</Body> : null}
      {mine.map((card) => (
        <HabitRow key={card.habit.id} card={card} busy={action.busy} onLog={(k) => log(card, k)} onUndo={undo} />
      ))}
      {partners.map((p) => {
        const theirHabits = data?.habits.filter((h) => h.playerId === p.id) ?? [];
        const done = theirHabits.filter((h) => data?.logs.some((l) => l.habitId === h.id && l.date === today));
        return (
          <View key={p.id}>
            <Heading>{p.display_name} today</Heading>
            <Body muted>{done.length ? done.map((h) => h.name).join(" · ") : "Nothing logged yet."}</Body>
          </View>
        );
      })}
    </Screen>
  );
}

function HabitRow({ card, busy, onLog, onUndo }: { card: HabitCard; busy: boolean; onLog: (k: "full" | "tiny") => void; onUndo: (id: string) => void }) {
  const t = useTheme();
  const { habit, goal, week, rate, todaysLogs, paused, scheduledToday, doneForToday } = card;
  const status = paused ? "paused" : !scheduledToday ? "rest day" : week ? `${week.done} of ${week.target} this week, ${week.daysLeft} days left` : todaysLogs.length ? "done today" : "not yet today";
  return (
    <Card>
      <Row>
        <Body style={{ fontWeight: "700", flex: 1 }}>{habit.name}</Body>
        <Body muted>{percent(rate)} · 14 days</Body>
      </Row>
      <Body muted>
        {describeGoal(goal)} · {status}
      </Body>
      {todaysLogs.map((l) => (
        <Row key={l.id}>
          <Body style={{ color: t.good, flex: 1 }}>
            ✓ {l.kind === "tiny" ? "tiny" : (l.tier ?? habit.tier)}
            {l.choreId ? " · chore" : l.source === "apple_health" ? " · Apple Health" : ""}
          </Body>
          {l.source === "tap" && !l.choreId ? <Button small kind="plain" label="Undo" onPress={() => onUndo(l.id)} /> : null}
        </Row>
      ))}
      {paused || doneForToday ? null : habit.allowTap ? (
        <Row>
          <Button small label="Done" busy={busy} onPress={() => onLog("full")} />
          <Button small kind="plain" label={`Tiny: ${habit.tinyVersion}`} busy={busy} onPress={() => onLog("tiny")} />
        </Row>
      ) : (
        <Body muted>Comes in from Apple Health.</Body>
      )}
    </Card>
  );
}
