import { useState } from "react";
import { activeGoal, DEFAULT_TUNING, habitSlots } from "@inn/engine";
import { Domain, Tier, type Goal } from "@inn/schema";
import { addHabit, archiveHabit, changeGoal, listGoals, listHabits } from "../../src/data/api.ts";
import { canAddHabit, describeGoal, WEEKDAYS } from "../../src/game/board.ts";
import type { HabitInfo } from "../../src/data/rows.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, Choice, ErrorText, Field, Heading, Row, Screen, Title } from "../../src/ui.tsx";

const domains = Domain.options.map((d) => ({ value: d, label: d }));
const tiers = Tier.options.map((d) => ({ value: d, label: d }));

export default function Habits() {
  const { player, today, changed } = useSession();
  const { data, error } = useData(async () => ({ habits: await listHabits(), goals: await listGoals() }));
  const [adding, setAdding] = useState(false);
  if (!player) return null;
  const mine = data?.habits.filter((h) => h.playerId === player.id) ?? [];
  const slots = habitSlots(player.started_on, today, DEFAULT_TUNING);
  const canAdd = canAddHabit(mine.length, player.started_on, today, DEFAULT_TUNING);

  return (
    <Screen>
      <Title sub={`${mine.length} of ${slots} habit slots in use`}>Habits</Title>
      <ErrorText error={error} />
      {mine.map((h) => (
        <HabitEditor key={h.id} habit={h} goal={data ? activeGoal(data.goals, h.id, today) : undefined} today={today} onSaved={changed} />
      ))}
      {adding ? (
        <NewHabit today={today} onDone={() => (setAdding(false), changed())} onCancel={() => setAdding(false)} />
      ) : (
        <Button label={canAdd ? "New habit" : "No free slots yet"} disabled={!canAdd} onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

function GoalFields({ goal, onChange }: { goal: Omit<Goal, "habitId" | "startDate">; onChange: (g: Omit<Goal, "habitId" | "startDate">) => void }) {
  return (
    <>
      <Choice
        options={[
          { value: "day", label: "Daily" },
          { value: "week", label: "Weekly" },
        ]}
        value={goal.period}
        onChange={(period) => onChange(period === "week" ? { period, target: Math.max(goal.target, 1), prescribed: goal.prescribed } : { period, target: 1, prescribed: goal.prescribed })}
      />
      {goal.period === "week" ? (
        <Choice options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: `${n}x` }))} value={goal.target} onChange={(target) => onChange({ ...goal, target })} />
      ) : (
        <Choice
          options={[{ value: -1, label: "Every day" }, ...WEEKDAYS.map((d, i) => ({ value: i, label: d }))]}
          selected={goal.days ?? [-1]}
          onChange={(d) => {
            if (d === -1) {
              const { days: _, ...rest } = goal;
              onChange(rest);
              return;
            }
            const days = goal.days ?? [];
            const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
            if (next.length === 0) {
              const { days: _, ...rest } = goal;
              onChange(rest);
            } else onChange({ ...goal, days: next });
          }}
        />
      )}
      {goal.period === "day" && goal.days ? <Body muted>Scheduled: {goal.days.map((d) => WEEKDAYS[d]).join(", ")}. Other days are rest days.</Body> : null}
      <Choice
        options={[
          { value: "no", label: "Normal goal" },
          { value: "yes", label: "Prescribed" },
        ]}
        value={goal.prescribed ? "yes" : "no"}
        onChange={(v) => onChange({ ...goal, prescribed: v === "yes" })}
      />
    </>
  );
}

function HabitEditor({ habit, goal, today, onSaved }: { habit: HabitInfo; goal: Goal | undefined; today: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Omit<Goal, "habitId" | "startDate">>(goal ?? { period: "day", target: 1, prescribed: false });
  const { busy, error, run } = useAction();
  return (
    <Card>
      <Body style={{ fontWeight: "700" }}>{habit.name}</Body>
      <Body muted>
        {habit.domain} · {describeGoal(goal)} · tiny: {habit.tinyVersion}
        {habit.healthType ? " · from Apple Health" : ""}
      </Body>
      {editing ? (
        <>
          <Heading>New goal from today</Heading>
          <Body muted style={{ marginBottom: 8 }}>Past weeks keep the goal they had.</Body>
          <GoalFields goal={draft} onChange={setDraft} />
          <Row>
            <Button small label="Save goal" busy={busy} onPress={() => run(async () => (await changeGoal({ ...draft, habitId: habit.id, startDate: today }), setEditing(false), onSaved()))} />
            <Button small kind="plain" label="Cancel" onPress={() => setEditing(false)} />
            <Button small kind="danger" label="Retire habit" busy={busy} onPress={() => run(async () => (await archiveHabit(habit.id, today), onSaved()))} />
          </Row>
          <ErrorText error={error} />
        </>
      ) : (
        <Row>
          <Button small kind="plain" label="Change goal" onPress={() => setEditing(true)} />
        </Row>
      )}
    </Card>
  );
}

function NewHabit({ today, onDone, onCancel }: { today: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<Domain>("home");
  const [tier, setTier] = useState<Tier>("normal");
  const [tiny, setTiny] = useState("");
  const [health, setHealth] = useState<"none" | "cycling" | "strength" | "sleep">("none");
  const [goal, setGoal] = useState<Omit<Goal, "habitId" | "startDate">>({ period: "day", target: 1, prescribed: false });
  const { busy, error, run } = useAction();
  return (
    <Card>
      <Heading>New habit</Heading>
      <Field label="Name" value={name} onChangeText={setName} maxLength={60} />
      <Field label="Tiny version (the smallest thing that still counts)" value={tiny} onChangeText={setTiny} maxLength={80} />
      <Body muted>Domain</Body>
      <Choice options={domains} value={domain} onChange={setDomain} />
      <Body muted>Size of a full session</Body>
      <Choice options={tiers} value={tier} onChange={setTier} />
      <Body muted>Logged by</Body>
      <Choice
        options={[
          { value: "none", label: "Tapping it" },
          { value: "cycling", label: "Apple Health rides" },
          { value: "strength", label: "Apple Health lifts" },
          { value: "sleep", label: "Apple Health sleep" },
        ]}
        value={health}
        onChange={setHealth}
      />
      <Body muted>Goal</Body>
      <GoalFields goal={goal} onChange={setGoal} />
      <Row>
        <Button
          label="Add habit"
          disabled={!name.trim() || !tiny.trim()}
          busy={busy}
          onPress={() =>
            run(async () => {
              await addHabit(
                { name: name.trim(), domain, tier, tiny_version: tiny.trim(), health_type: health === "none" ? null : health, allow_tap: health === "none" },
                { ...goal, startDate: today },
              );
              onDone();
            })
          }
        />
        <Button kind="plain" label="Cancel" onPress={onCancel} />
      </Row>
      <ErrorText error={error} />
    </Card>
  );
}
