import { View } from "react-native";
import { classPath } from "@inn/content";
import { DEFAULT_TUNING } from "@inn/engine";
import { getChoices, getMyState, getNames, isDayClosed, listHousemates, listMornings, saveChoices } from "../../src/data/api.ts";
import { displayClass, levelProgress, roman, skillView } from "../../src/game/character.ts";
import { useAction, useData, useSession } from "../../src/session.tsx";
import { Character, Stage } from "../../src/sprite.tsx";
import { Body, Button, Card, ErrorText, Heading, ProgressBar, Prose, Row, Screen, SystemBox, Title, useTheme } from "../../src/ui.tsx";

/** The character sheet and the System's record: class, level, Skills, Level 10 choices, past mornings. */
export default function System() {
  const t = useTheme();
  const { player, today, changed } = useSession();
  const { data, error } = useData(
    async () => {
      if (!player) return undefined;
      const [state, names, choices, mornings, people, asleep] = await Promise.all([getMyState(), getNames(player.id), getChoices(today), listMornings(14), listHousemates(), isDayClosed(today)]);
      return { state, names, choices, mornings, people, asleep };
    },
    [player?.id, today],
  );
  const action = useAction();
  if (!player) return null;

  const base = player.class_path_id ? classPath(player.class_path_id).name : "[Earther]";
  const state = data?.state;
  const cls = state && data ? displayClass(base, state, data.names.evolutions) : base;
  const progress = state ? levelProgress(state, DEFAULT_TUNING) : undefined;
  const asleep = data?.asleep === true;
  const choose = (patch: Parameters<typeof saveChoices>[1]) => (asleep ? undefined : action.run(async () => (await saveChoices(today, patch), changed())));
  const nameOf = (id: string) => (id === player.id ? "You" : (data?.people.find((p) => p.id === id)?.display_name ?? "?"));

  return (
    <Screen>
      <Title sub={state ? (state.progress.level > 0 ? `${player.display_name} · Level ${state.progress.level}` : `${player.display_name} · your class comes on the first night`) : player.display_name}>{cls}</Title>
      <ErrorText error={error ?? action.error} />
      <Stage>
        <Character player={player} scale={6} you />
      </Stage>
      {progress && state && state.progress.level > 0 ? (
        <ProgressBar value={progress.share} label={`${progress.into} of ${progress.need} XP toward Level ${state.progress.level + 1}. Levels come while you sleep.`} />
      ) : null}

      {state?.pendingSkillChoice ? (
        <>
          <Heading>Choose a Skill</Heading>
          <Body muted style={{ marginBottom: 8 }}>{asleep ? "You're asleep. Choose after the morning." : "The System offers two. Your pick is granted tonight."}</Body>
          {state.pendingSkillChoice.options.map((g) => {
            const v = skillView(g.skill, data?.names.skills ?? {});
            const picked = data?.choices?.skill === g.skill.defId;
            return (
              <Card key={g.skill.defId} onPress={() => choose({ skill: g.skill.defId })}>
                <Body style={{ fontWeight: "700", color: picked ? t.accent : t.text }}>
                  {picked ? "✓ " : ""}
                  {v.name} {roman(v.tier)}
                </Body>
                <Body muted>{v.flavor ?? v.summary}</Body>
                {v.flavor ? <Body muted>{v.summary}</Body> : null}
              </Card>
            );
          })}
        </>
      ) : null}

      {state?.pendingEvolution ? (
        <>
          <Heading>Class evolution</Heading>
          <Body muted style={{ marginBottom: 8 }}>{asleep ? "You're asleep. Choose after the morning." : "Level 10. Who are you becoming? The change takes hold tonight."}</Body>
          {state.pendingEvolution.options.map((o) => {
            const named = data?.names.evolutions[o.id];
            const picked = data?.choices?.evolution === o.id;
            return (
              <Card key={o.id} onPress={() => choose({ evolution: o.id })}>
                <Body style={{ fontWeight: "700", color: picked ? t.accent : t.text }}>
                  {picked ? "✓ " : ""}
                  {named?.name ?? o.fallbackName}
                </Body>
                <Body muted>{named?.text ?? `Shaped by ${o.domain}.`}</Body>
              </Card>
            );
          })}
          {state.pendingEvolution.rerolled ? (
            <Body muted>You've used your one reroll.</Body>
          ) : (
            <Button
              kind="plain"
              label={data?.choices?.reroll_evolution ? "Reroll asked for tonight" : "None of these: reroll once"}
              disabled={asleep || data?.choices?.reroll_evolution === true}
              busy={action.busy}
              onPress={() => choose({ reroll_evolution: true, evolution: null })}
            />
          )}
        </>
      ) : null}

      <Heading>Skills</Heading>
      {state && state.skills.length === 0 ? <Body muted>No Skills yet. The first comes at Level 2.</Body> : null}
      {state?.skills.map((s) => {
        const v = skillView(s, data?.names.skills ?? {});
        return (
          <Card key={s.defId}>
            <Row>
              <Body style={{ fontWeight: "700", flex: 1 }}>
                {v.name} {roman(v.tier)}
              </Body>
              <Body muted>{v.type}</Body>
            </Row>
            {v.flavor ? <Body muted>{v.flavor}</Body> : null}
            <Body muted>{v.summary}</Body>
          </Card>
        );
      })}

      <Heading>Mornings</Heading>
      {data && data.mornings.length === 0 ? <Body muted>The System speaks after your first night. Tap "Go to sleep" on Today, or wait for 4 a.m.</Body> : null}
      {data?.mornings.map((m) => (
        <View key={m.date} style={{ marginBottom: 12 }}>
          <Body muted style={{ marginBottom: 6 }}>{m.date}</Body>
          {Object.entries(m.messages).map(([id, lines]) =>
            lines.length > 0 ? (
              <SystemBox key={id} lines={lines}>
                <Body muted style={{ marginTop: 4, fontSize: 13 }}>{nameOf(id)}</Body>
              </SystemBox>
            ) : null,
          )}
          <Prose>{m.scene}</Prose>
        </View>
      ))}
    </Screen>
  );
}
