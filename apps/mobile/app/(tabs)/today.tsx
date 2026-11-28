import { router } from "expo-router";
import { Alert, View } from "react-native";
import { CLASS_PATHS } from "@inn/content";
import { addDays, DEFAULT_TUNING, type PlayerState } from "@inn/engine";
import {
  addLog,
  getChoices,
  getMyState,
  getNames,
  goToSleep,
  isDayClosed,
  listGoals,
  listHabits,
  listHousemates,
  listLogs,
  listMornings,
  listMyOutings,
  listMyPauses,
  removeLog,
  saveChoices,
} from "../../src/data/api.ts";
import { buildBoard, describeGoal, logWindowStart, percent, type HabitCard } from "../../src/game/board.ts";
import { graceLeft, graceSkill, skillView } from "../../src/game/character.ts";
import { staminaLeft } from "../../src/game/house.ts";
import { useHealth } from "../../src/health/useHealth.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, ErrorText, Heading, Row, Screen, SystemBox, Title, useTheme } from "../../src/ui.tsx";

export default function Today() {
  const { player, today, changed } = useSession();
  const from = logWindowStart(today, DEFAULT_TUNING);
  const { data, error } = useData(
    async () => {
      const [habits, goals, pauses, logs, people, state, mornings, asleep, choices, names, outings] = await Promise.all([
        listHabits(),
        listGoals(),
        listMyPauses(),
        listLogs(from, today),
        listHousemates(),
        getMyState(),
        listMornings(1),
        isDayClosed(today),
        getChoices(today),
        player ? getNames(player.id) : Promise.resolve({ skills: {}, evolutions: {} }),
        player ? listMyOutings(player.id, today) : Promise.resolve([]),
      ]);
      return { habits, goals, pauses, logs, people, state, morning: mornings[0], asleep, choices, names, outings };
    },
    [from, today],
  );
  const action = useAction();
  const health = useHealth(player?.id, player?.time_zone, data?.habits, today, changed);
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
  const grace = data?.choices?.grace ?? [];
  const markGrace = (habitId: string) => action.run(async () => (await saveChoices(today, { grace: [...grace, habitId] }), changed()));
  const sleep = () =>
    Alert.alert("Go to sleep?", "Today closes now. Your logs lock, and the System speaks once your housemate sleeps too (or at 4 a.m.).", [
      { text: "Not yet", style: "cancel" },
      // Pull in tonight's late workout before the day locks.
      { text: "Sleep", onPress: () => void action.run(async () => (await health.sync(), await goToSleep(), changed())) },
    ]);
  // Show the morning on Today until the next night closes: it's dated yesterday (or today, after an early sleep).
  const morning = data?.morning && data.morning.date >= addDays(today, -1) ? data.morning : undefined;
  const myLines = morning?.messages[player.id] ?? [];

  return (
    <Screen>
      <Title sub={`${path?.name ?? ""} · ${today} · logs stay open until you sleep`}>Today</Title>
      <ErrorText error={error ?? action.error} />
      {morning ? (
        <View style={{ marginBottom: 8 }}>
          {myLines.length > 0 ? <SystemBox lines={myLines} /> : null}
          <Body>{morning.scene}</Body>
        </View>
      ) : null}
      {health.wanted && health.available && health.needsPermission && !data?.asleep ? (
        <Card onPress={() => void health.connect()}>
          <Body style={{ fontWeight: "700" }}>Connect Apple Health</Body>
          <Body muted>Rides, lifts and sleep come in from Apple Health (turn on Garmin Connect's Apple Health sync). Only the workout type, times, duration, distance and hours asleep are read.</Body>
        </Card>
      ) : null}
      {health.wanted && !health.available ? <Body muted>Apple Health isn't available on this device, so rides and lifts can't come in.</Body> : null}
      {health.error ? <ErrorText error={`Apple Health: ${health.error}`} /> : null}
      {data?.asleep ? (
        <Card>
          <Body style={{ fontWeight: "700" }}>You're asleep.</Body>
          <Body muted>Today is closed. The System is at work; your morning comes with the next run.</Body>
        </Card>
      ) : null}
      {mine.length === 0 && data ? <Body muted>No habits yet. Add some on the Habits tab.</Body> : null}
      {mine.map((card) => (
        <HabitRow
          key={card.habit.id}
          card={card}
          busy={action.busy}
          closed={data?.asleep === true}
          grace={data ? graceButton(card, data.state, data.names.skills, grace, mine, today) : undefined}
          onLog={(k) => log(card, k)}
          onUndo={undo}
          onGrace={() => markGrace(card.habit.id)}
        />
      ))}
      {data && !data.asleep && data.state.progress.level > 0 ? (
        <Card onPress={() => router.push("/outing")}>
          <Body style={{ fontWeight: "700" }}>Around Liscor</Body>
          <Body muted>
            Stamina {staminaLeft(data.state, data.outings.length, DEFAULT_TUNING)}. {data.outings.some((o) => o.choices.length < DEFAULT_TUNING.expedition.events) ? "An outing is waiting for you." : "Errands, foraging, the odd rock crab. Tap to set out."}
          </Body>
        </Card>
      ) : null}
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
      {data && !data.asleep ? (
        <View style={{ marginTop: 24 }}>
          <Button kind="plain" label="Go to sleep" busy={action.busy} onPress={sleep} />
          {health.addTestRide && health.wanted && !health.needsPermission ? (
            <Button small kind="plain" label="Dev: add a 40-minute ride to Apple Health" busy={health.syncing} onPress={() => void health.addTestRide?.(40)} />
          ) : null}
          <Body muted style={{ marginTop: 6, fontSize: 13 }}>Closes today early. Otherwise it closes by itself at 4 a.m.</Body>
        </View>
      ) : null}
    </Screen>
  );
}

interface GraceButton {
  label: string;
  /** Already marked for tonight. */
  pending: boolean;
}

/** A grace-day button for a habit not done today, when a grace Skill has a charge left this week. */
function graceButton(card: HabitCard, state: PlayerState, names: Parameters<typeof skillView>[1], pending: readonly string[], all: readonly HabitCard[], today: string): GraceButton | undefined {
  const skill = graceSkill(state, card.habit.domain);
  // Only when it saves something: not paused, not done, a scheduled day, and a weekly goal not yet met.
  if (!skill || card.paused || card.todaysLogs.length > 0 || !card.scheduledToday || card.week?.met) return undefined;
  const name = skillView(skill, names).name;
  if (pending.includes(card.habit.id)) return { label: `${name} will keep this tonight`, pending: true };
  const pendingInDomain = all.filter((c) => pending.includes(c.habit.id) && graceSkill(state, c.habit.domain)?.defId === skill.defId).length;
  return graceLeft(state, card.habit.domain, today, pendingInDomain) > 0 ? { label: `Use ${name}`, pending: false } : undefined;
}

function HabitRow({
  card,
  busy,
  closed,
  grace,
  onLog,
  onUndo,
  onGrace,
}: {
  card: HabitCard;
  busy: boolean;
  closed: boolean;
  grace: GraceButton | undefined;
  onLog: (k: "full" | "tiny") => void;
  onUndo: (id: string) => void;
  onGrace: () => void;
}) {
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
          {l.source === "tap" && !l.choreId && !closed ? <Button small kind="plain" label="Undo" onPress={() => onUndo(l.id)} /> : null}
        </Row>
      ))}
      {paused || doneForToday || closed ? null : habit.allowTap ? (
        <Row>
          <Button small label="Done" busy={busy} onPress={() => onLog("full")} />
          <Button small kind="plain" label={`Tiny: ${habit.tinyVersion}`} busy={busy} onPress={() => onLog("tiny")} />
        </Row>
      ) : (
        <Body muted>Comes in from Apple Health.</Body>
      )}
      {grace && !closed ? (
        grace.pending ? (
          <Body muted>{grace.label}</Body>
        ) : (
          <Button small kind="plain" label={grace.label} busy={busy} onPress={onGrace} />
        )
      ) : null}
    </Card>
  );
}
