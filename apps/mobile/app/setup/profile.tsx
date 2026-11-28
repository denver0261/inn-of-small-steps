import { router } from "expo-router";
import { useState } from "react";
import { gameDate, systemClock } from "@inn/engine";
import { createPlayer, signOut } from "../../src/data/api.ts";
import { deviceTimeZone, useAction, useSession } from "../../src/session.tsx";
import { Body, Button, ErrorText, Field, Screen, Title } from "../../src/ui.tsx";

export default function Profile() {
  const { session, refresh } = useSession();
  const [name, setName] = useState("");
  const timeZone = deviceTimeZone();
  const { busy, error, run } = useAction();

  return (
    <Screen>
      <Title sub="Step 1 of 4">Arrive</Title>
      <Body muted style={{ marginBottom: 16 }}>
        The door gives way to a run-down house inside Liscor's walls. Someone will want a name for the rent book.
      </Body>
      <Field label="Your name" value={name} onChangeText={setName} maxLength={40} />
      <Body muted style={{ marginBottom: 16 }}>Time zone: {timeZone}. Days close at 4 a.m.</Body>
      <Button
        label="Continue"
        disabled={name.trim().length === 0 || !session}
        busy={busy}
        onPress={() =>
          run(async () => {
            await createPlayer({ id: session!.user.id, displayName: name.trim(), timeZone, startedOn: gameDate(systemClock, timeZone) });
            await refresh();
            router.replace("/");
          })
        }
      />
      <ErrorText error={error} />
      <Button label="Use a different email" kind="plain" onPress={() => void signOut().then(() => router.replace("/"))} />
    </Screen>
  );
}
