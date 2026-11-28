import { useState } from "react";
import { View } from "react-native";
import { checkOffChore, dueChores, dueDate, overdueDays } from "@inn/engine";
import { Tier, type Chore, type RepeatRule } from "@inn/schema";
import { addChore, listChores, listHabits, listHousemates, listRooms, removeChore, saveCheckOff, type Room } from "../../src/data/api.ts";
import { WEEKDAYS } from "../../src/game/board.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, Choice, ErrorText, Field, Heading, Row, Screen, Title, useTheme } from "../../src/ui.tsx";

export default function Chores() {
  const t = useTheme();
  const { player, today, changed } = useSession();
  const { data, error } = useData(async () => {
    const [chores, rooms, habits, people] = await Promise.all([listChores(), listRooms(), listHabits(), listHousemates()]);
    return { chores, rooms, habits, people };
  });
  const [adding, setAdding] = useState(false);
  const action = useAction();
  if (!player) return null;

  const rooms = data?.rooms ?? [];
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? "?";
  const personName = (id: string | undefined) => (id === undefined ? "either" : id === player.id ? "you" : (data?.people.find((p) => p.id === id)?.display_name ?? "?"));
  const homeHabit = data?.habits.find((h) => h.playerId === player.id && h.domain === "home");
  const due = dueChores(data?.chores ?? [], today, rooms.map((r) => r.id));
  const upcoming = (data?.chores ?? [])
    .filter((c) => !due.includes(c) && dueDate(c) !== undefined)
    .sort((a, b) => (dueDate(a) ?? "").localeCompare(dueDate(b) ?? ""));

  const checkOff = (c: Chore) =>
    action.run(async () => {
      if (!homeHabit) throw new Error("Add a Home habit (like Tidying) first: chores log to it.");
      const r = checkOffChore(c, player.id, today, homeHabit.id);
      await saveCheckOff(r.chore, r.log);
      changed();
    });

  return (
    <Screen>
      <Title sub="Shared by the house. Checking one off logs it for whoever did it.">Chores</Title>
      <ErrorText error={error ?? action.error} />
      {rooms.length === 0 && data ? <Body muted>Add your rooms on the House tab first.</Body> : null}
      {due.length === 0 && data && rooms.length > 0 ? <Body muted>Nothing due. The house is in order.</Body> : null}
      {due.map((c, i) => (
        <View key={c.id}>
          {i === 0 || due[i - 1]?.roomId !== c.roomId ? <Heading>{roomName(c.roomId)}</Heading> : null}
          <Card>
            <Row>
              <Body style={{ fontWeight: "700", flex: 1 }}>{c.title}</Body>
              <Button small label="Done" busy={action.busy} onPress={() => checkOff(c)} />
            </Row>
            <Body muted>
              {c.size} · {describeRepeat(c.repeat)} · {personName(c.assignee)}
              {overdueDays(c, today) > 0 ? <Body style={{ color: t.danger }}> · {overdueDays(c, today)} days overdue</Body> : null}
            </Body>
          </Card>
        </View>
      ))}
      {upcoming.length > 0 ? <Heading>Coming up</Heading> : null}
      {upcoming.map((c) => (
        <Card key={c.id}>
          <Body>
            {c.title} · {roomName(c.roomId)}
          </Body>
          <Body muted>
            due {dueDate(c)}
            {c.lastDoneOn ? ` · last done by ${personName(c.lastDoneBy)} on ${c.lastDoneOn}` : ""}
          </Body>
          <Row>
            <Button small kind="danger" label="Remove" onPress={() => action.run(async () => (await removeChore(c.id), changed()))} />
          </Row>
        </Card>
      ))}
      {rooms.length > 0 ? (
        adding ? (
          <NewChore rooms={rooms} people={data?.people ?? []} meId={player.id} today={today} onDone={() => (setAdding(false), changed())} onCancel={() => setAdding(false)} />
        ) : (
          <Button label="Add a chore" onPress={() => setAdding(true)} />
        )
      ) : null}
    </Screen>
  );
}

function describeRepeat(r: RepeatRule | undefined): string {
  if (!r) return "once";
  if (r.kind === "every") return r.days === 1 ? "daily" : `every ${r.days} days`;
  return `weekly on ${r.days.map((d) => WEEKDAYS[d]).join(", ")}`;
}

function NewChore({
  rooms,
  people,
  meId,
  today,
  onDone,
  onCancel,
}: {
  rooms: Room[];
  people: { id: string; display_name: string }[];
  meId: string;
  today: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState(rooms[0]?.id);
  const [size, setSize] = useState<Tier>("normal");
  const [repeat, setRepeat] = useState<"once" | "every" | "weekly">("every");
  const [every, setEvery] = useState("7");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [assignee, setAssignee] = useState<string>("either");
  const { busy, error, run } = useAction();
  const everyDays = Number.parseInt(every, 10);
  const rule: RepeatRule | undefined = repeat === "every" ? { kind: "every", days: everyDays } : repeat === "weekly" ? { kind: "weekly", days: weekdays } : undefined;
  const valid = title.trim() && roomId && (repeat !== "every" || everyDays >= 1) && (repeat !== "weekly" || weekdays.length > 0);

  return (
    <Card>
      <Heading>New chore</Heading>
      <Field label="Chore" value={title} onChangeText={setTitle} maxLength={80} />
      <Body muted>Room</Body>
      <Choice options={rooms.map((r) => ({ value: r.id, label: r.name }))} value={roomId} onChange={setRoomId} />
      <Body muted>Size</Body>
      <Choice options={Tier.options.map((s) => ({ value: s, label: s }))} value={size} onChange={setSize} />
      <Body muted>Repeats</Body>
      <Choice
        options={[
          { value: "once", label: "Once" },
          { value: "every", label: "Every N days" },
          { value: "weekly", label: "Weekly on…" },
        ]}
        value={repeat}
        onChange={setRepeat}
      />
      {repeat === "every" ? <Field label="Every how many days?" value={every} onChangeText={setEvery} keyboardType="number-pad" /> : null}
      {repeat === "weekly" ? (
        <Choice
          options={WEEKDAYS.map((d, i) => ({ value: i, label: d }))}
          value={undefined}
          onChange={(d) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()))}
        />
      ) : null}
      {repeat === "weekly" && weekdays.length ? <Body muted>On {weekdays.map((d) => WEEKDAYS[d]).join(", ")}</Body> : null}
      <Body muted>Whose is it?</Body>
      <Choice options={[{ value: "either", label: "Either" }, ...people.map((p) => ({ value: p.id, label: p.id === meId ? "Me" : p.display_name }))]} value={assignee} onChange={setAssignee} />
      <Row>
        <Button
          label="Add chore"
          disabled={!valid}
          busy={busy}
          onPress={() =>
            run(async () => {
              await addChore({
                title: title.trim(),
                roomId: roomId!,
                size,
                ...(rule ? { repeat: rule } : {}),
                ...(assignee !== "either" ? { assignee } : {}),
                createdOn: today,
              });
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
