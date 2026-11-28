import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { TIER1_EVENTS } from "@inn/content";
import { DEFAULT_TUNING } from "@inn/engine";
import { getMyState, isDayClosed, listMyOutings, saveOutingChoices, startOuting } from "../src/data/api.ts";
import { describeLoot, previewOutings, staminaLeft } from "../src/game/house.ts";
import { skillView } from "../src/game/character.ts";
import { useAction, useData, useSession } from "../src/session.tsx";
import { Body, Button, Card, ErrorText, Heading, Screen, SystemBox, Title, useTheme } from "../src/ui.tsx";

const COST = DEFAULT_TUNING.expedition.staminaCost;

/** A Tier 1 outing around Liscor: three events, a choice each, a d20 behind every choice. Loot comes home tonight. */
export default function Outing() {
  const t = useTheme();
  const { player, today, changed } = useSession();
  const { data, error } = useData(
    async () => {
      if (!player) return undefined;
      const [state, outings, asleep] = await Promise.all([getMyState(), listMyOutings(player.id, today), isDayClosed(today)]);
      return { state, outings, asleep };
    },
    [player?.id, today],
  );
  const action = useAction();
  // The outcome on screen: which outing, and after how many choices.
  const [shown, setShown] = useState<{ index: number; step: number } | null>(null);
  if (!player || !data) return <Screen><ErrorText error={error} /></Screen>;

  const previews = previewOutings(data.state, player.id, today, data.outings, DEFAULT_TUNING);
  const showing = shown ? previews.find((o) => o.index === shown.index && o.choices.length === shown.step) : undefined;
  // The outing on screen: one whose outcome is showing (even if that was its last event), else one not finished.
  const current = showing ?? previews.find((o) => !o.finished);
  const left = staminaLeft(data.state, data.outings.length, DEFAULT_TUNING);
  const lastStep = showing?.result.steps.at(-1);
  const showingOutcome = showing !== undefined && lastStep !== undefined;
  const eventIndex = current ? current.choices.length - (showingOutcome ? 1 : 0) : 0;
  const event = current ? TIER1_EVENTS.find((e) => e.id === current.eventIds[eventIndex]) : undefined;

  const choose = (choice: number) =>
    action.run(async () => {
      if (!current) return;
      const choices = [...current.choices, choice];
      await saveOutingChoices(player.id, today, current.index, choices);
      setShown({ index: current.index, step: choices.length });
      changed();
    });
  const begin = () => action.run(async () => (await startOuting(today, data.outings.length), setShown(null), changed()));
  const finishedToday = previews.filter((o) => o.finished && o !== showing);

  return (
    <Screen>
      <Title sub={`Stamina ${left}. An outing costs ${COST}. What you find comes home tonight.`}>Around Liscor</Title>
      <ErrorText error={error ?? action.error} />

      {current && event && (showingOutcome || !current.finished) ? (
        <Card>
          <Heading>{event.place}</Heading>
          <Body style={{ marginBottom: 12 }}>{event.setup}</Body>
          {showingOutcome && lastStep ? (
            <>
              <SystemBox lines={[lastStep.success ? "[Success]" : "[Setback]"]}>
                <Body muted style={{ fontSize: 13 }}>
                  Rolled {lastStep.roll}
                  {lastStep.bonus ? ` + ${lastStep.bonus}` : ""} against {lastStep.difficulty}
                </Body>
              </SystemBox>
              <Body style={{ marginBottom: 8 }}>{lastStep.text}</Body>
              <Body muted style={{ marginBottom: 12 }}>Found: {describeLoot(lastStep.loot)}</Body>
              <Button label={current.finished ? "Head home" : "Go on"} onPress={() => setShown(null)} />
            </>
          ) : (
            event.choices.map((c, i) => {
              const helped = data.state.skills.find((s) => s.theme === c.theme);
              return (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Button kind={i === 0 ? "primary" : "plain"} label={c.label} busy={action.busy} disabled={data.asleep} onPress={() => choose(i)} />
                  <Body muted style={{ fontSize: 13, marginTop: 2 }}>
                    {c.theme}
                    {helped ? ` · ${skillView(helped, {}).name} helps` : ""}
                  </Body>
                </View>
              );
            })
          )}
        </Card>
      ) : (
        <>
          {data.asleep ? <Body muted>You're asleep. Outings wait for tomorrow.</Body> : null}
          <Button label={left >= COST ? "Set out" : "Not enough stamina"} disabled={left < COST || data.asleep} busy={action.busy} onPress={begin} />
          <Body muted style={{ marginTop: 6, fontSize: 13 }}>Stamina comes from rides, lifting, PT, eating well and sleep, and refills at night.</Body>
        </>
      )}

      {finishedToday.length > 0 ? <Heading>Today's outings</Heading> : null}
      {finishedToday.map((o) => (
        <Card key={o.index}>
          <Body style={{ fontWeight: "700" }}>{o.result.steps.filter((s) => s.success).length} of {o.result.steps.length} went well</Body>
          <Body muted>Bringing home: {describeLoot(o.result.loot)}</Body>
          {o.result.rare ? <Body style={{ color: t.accent }}>A rare find!</Body> : null}
        </Card>
      ))}
      <Button kind="plain" label="Back" onPress={() => router.back()} />
    </Screen>
  );
}
