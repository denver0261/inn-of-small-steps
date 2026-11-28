import { router } from "expo-router";
import { useState } from "react";
import { sendCode, verifyCode } from "../src/data/api.ts";
import { useAction } from "../src/session.tsx";
import { Body, Button, ErrorText, Field, Screen, Title } from "../src/ui.tsx";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();

  return (
    <Screen>
      <Title sub="You come through to Liscor as new Earthers. First, who are you?">Inn of Small Steps</Title>
      {!sent ? (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Button
            label="Send me a code"
            disabled={!email.includes("@")}
            busy={busy}
            onPress={() => run(async () => (await sendCode(email.trim()), setSent(true)))}
          />
        </>
      ) : (
        <>
          <Body muted>We sent a 6-digit code to {email.trim()}.</Body>
          <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
          <Button
            label="Sign in"
            disabled={code.length !== 6}
            busy={busy}
            onPress={() => run(async () => (await verifyCode(email.trim(), code), router.replace("/")))}
          />
          <Button label="Use a different email" kind="plain" onPress={() => (setSent(false), setCode(""))} />
        </>
      )}
      <ErrorText error={error} />
    </Screen>
  );
}
