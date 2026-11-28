import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { acceptInvite, createHousehold } from "../../src/data/api.ts";
import { useAction, useSession } from "../../src/session.tsx";
import { Body, Button, ErrorText, Field, Heading, Screen, Title } from "../../src/ui.tsx";

export default function House() {
  const { refresh } = useSession();
  const params = useLocalSearchParams<{ code?: string }>();
  const [name, setName] = useState("The house by the wall");
  const [code, setCode] = useState(params.code ?? "");
  const { busy, error, run } = useAction();
  const done = async () => (await refresh(), router.replace("/"));

  return (
    <Screen>
      <Title sub="Step 2 of 4">Your house</Title>
      <Heading>Got an invite?</Heading>
      <Body muted style={{ marginBottom: 12 }}>If your partner already moved in, use the code they sent.</Body>
      <Field label="Invite code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
      <Button label="Join the house" disabled={code.trim().length === 0} busy={busy} onPress={() => run(async () => (await acceptInvite(code), await done()))} />
      <Heading>Or rent the house</Heading>
      <Field label="House name" value={name} onChangeText={setName} maxLength={80} />
      <Button label="Rent it" kind="plain" disabled={name.trim().length === 0} busy={busy} onPress={() => run(async () => (await createHousehold(name.trim()), await done()))} />
      <ErrorText error={error} />
    </Screen>
  );
}
