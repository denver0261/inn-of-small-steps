import { router } from "expo-router";
import { useState } from "react";
import { Share } from "react-native";
import { CLASS_PATHS } from "@inn/content";
import { daysBetween } from "@inn/engine";
import { addRoom, createInvite, listHousemates, listRooms, signOut, updatePlayer } from "../../src/data/api.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, Choice, ErrorText, Field, Heading, Row, Screen, Title } from "../../src/ui.tsx";

/** Free path switching lasts this many days (docs/design.md, "Day one"). */
const PATH_SWITCH_DAYS = 7;

export default function House() {
  const { player, household, today, changed, refresh } = useSession();
  const { data, error } = useData(async () => ({ people: await listHousemates(), rooms: await listRooms() }));
  const [room, setRoom] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const action = useAction();
  if (!player || !household) return null;
  const canSwitchPath = daysBetween(player.started_on, today) < PATH_SWITCH_DAYS;
  const rooms = data?.rooms ?? [];

  return (
    <Screen>
      <Title sub="Your house in Liscor, shared by both of you.">{household.name}</Title>
      <ErrorText error={error ?? action.error} />

      <Heading>Who lives here</Heading>
      {data?.people.map((p) => (
        <Body key={p.id}>
          {p.display_name}
          {p.id === player.id ? " (you)" : ""} · {CLASS_PATHS.find((c) => c.id === p.class_path_id)?.name ?? "no path yet"}
        </Body>
      ))}
      {invite ? (
        <Card>
          <Body>Invite code (one use, good for 7 days):</Body>
          <Body style={{ fontWeight: "700", fontSize: 18, marginVertical: 6 }} >{invite}</Body>
          <Button small kind="plain" label="Share invite link" onPress={() => void Share.share({ message: `Move into ${household.name} with me in Inn of Small Steps: innofsmallsteps://join?code=${invite}` })} />
        </Card>
      ) : (
        <Button kind="plain" label="Invite your partner" busy={action.busy} onPress={() => action.run(async () => setInvite(await createInvite()))} />
      )}

      <Heading>Rooms</Heading>
      <Body muted style={{ marginBottom: 8 }}>Name your real rooms; chores are sorted by them.</Body>
      {rooms.map((r) => (
        <Body key={r.id}>· {r.name}</Body>
      ))}
      <Row>
        <Field label="New room" value={room} onChangeText={setRoom} maxLength={40} />
      </Row>
      <Button
        small
        label="Add room"
        disabled={!room.trim()}
        busy={action.busy}
        onPress={() => action.run(async () => (await addRoom(room.trim(), rooms.length), setRoom(""), changed()))}
      />

      <Heading>Your path</Heading>
      {canSwitchPath ? (
        <>
          <Body muted style={{ marginBottom: 8 }}>You can switch freely until day {PATH_SWITCH_DAYS}.</Body>
          <Choice
            options={CLASS_PATHS.map((c) => ({ value: c.id, label: c.name }))}
            value={player.class_path_id ?? undefined}
            onChange={(id) => action.run(async () => (await updatePlayer(player.id, { class_path_id: id }), await refresh()))}
          />
        </>
      ) : (
        <Body>{CLASS_PATHS.find((c) => c.id === player.class_path_id)?.name}</Body>
      )}

      <Heading>Account</Heading>
      <Button kind="plain" label="Sign out" onPress={() => void signOut().then(() => router.replace("/"))} />
    </Screen>
  );
}
