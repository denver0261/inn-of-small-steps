import { router } from "expo-router";
import { useState } from "react";
import { Share, View } from "react-native";
import { CLASS_PATHS, ITEMS, RECIPES, RECRUITS, UPGRADES, VISITORS } from "@inn/content";
import { canAfford, daysBetween, DEFAULT_TUNING, ladderReady, masteryRank, nextUpgrade } from "@inn/engine";
import type { Resources } from "@inn/schema";
import { addOrder, addRoom, cancelOrder, createInvite, getHouse, isDayClosed, listChores, listHabits, listHousemates, listLogs, listOrders, listRooms, signOut, updatePlayer } from "../src/data/api.ts";
import { activityFrom, describeReward, innScene, questView } from "../src/game/visitors.ts";
import { sceneLines } from "../src/game/house.ts";
import { useAction, useData, useSession } from "../src/session.tsx";
import { Body, Button, Card, Choice, ErrorText, Field, Heading, Row, Screen, SystemBox, Title, useTheme } from "../src/ui.tsx";

function orderLabel(kind: string, ref: string): string {
  if (kind === "build") return `Build ${UPGRADES.find((u) => u.id === ref)?.name}`;
  if (kind === "craft") return `Cook ${RECIPES.find((r) => r.id === ref)?.name}`;
  if (kind === "meal") return `Eat ${ITEMS.find((i) => i.id === ref)?.name}`;
  if (kind === "inn") return "An evening at the Inn";
  const visitor = VISITORS.find((v) => ref.startsWith(`${v.id}:`))?.name ?? "a visitor";
  return kind === "accept" ? `Help ${visitor.charAt(0).toLowerCase() + visitor.slice(1)}` : kind === "serve" ? "Serve a guest platter" : "Turn a visitor away";
}

const cost = (c: Resources) =>
  Object.entries(c)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([r, n]) => `${n} ${r}`)
    .join(", ") || "free";

/** Free path switching lasts this many days (docs/design.md, "Day one"). */
const PATH_SWITCH_DAYS = 7;

export default function House() {
  const { player, household, today, changed, refresh } = useSession();
  const t = useTheme();
  const { data, error } = useData(async () => {
    const [people, rooms, house, orders, chores, asleep, habits] = await Promise.all([listHousemates(), listRooms(), getHouse(), listOrders(today), listChores(), isDayClosed(today), listHabits()]);
    const from = house.quests.map((q) => q.startDate).sort()[0];
    const logs = from && from <= today ? await listLogs(from, today) : [];
    return { people, rooms, house, orders, chores, asleep, activity: activityFrom(logs, habits) };
  }, [today]);
  const [room, setRoom] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const action = useAction();
  if (!player || !household) return null;
  const canSwitchPath = daysBetween(player.started_on, today) < PATH_SWITCH_DAYS;
  const rooms = data?.rooms ?? [];
  const house = data?.house;
  const orders = data?.orders ?? [];
  const order = (kind: "build" | "craft" | "meal" | "accept" | "decline" | "serve" | "inn", ref: string) => action.run(async () => (await addOrder(today, kind, ref), changed()));
  const cancel = (id: string) => action.run(async () => (await cancelOrder(id), changed()));
  const who = (id: string) => (id === player.id ? "you" : (data?.people.find((p) => p.id === id)?.display_name ?? "?"));
  const next = house ? nextUpgrade(house, UPGRADES) : undefined;
  const kitchen = house?.upgrades.includes("kitchen") ?? false;
  const stash = Object.entries(house?.stash ?? {}).filter(([, n]) => n > 0);
  const locked = data?.asleep === true;

  return (
    <Screen>
      <View style={{ alignSelf: "flex-start", marginBottom: 8 }}>
        <Button small kind="plain" label="‹ The Inn" onPress={() => (router.canGoBack() ? router.back() : router.replace("/inn"))} />
      </View>
      <Title sub="Your house in Liscor, shared by both of you.">{household.name}</Title>
      <ErrorText error={error ?? action.error} />

      {house ? (
        <>
          {sceneLines(house, rooms, data?.chores ?? [], today).map((line, i) => (
            <Body key={i} style={{ marginBottom: 6 }}>{line}</Body>
          ))}
          <Body muted style={{ marginTop: 6 }}>
            {house.resources.coins} coins · {house.resources.supplies} supplies · {house.resources.mana} mana · {house.resources.goodwill} goodwill
          </Body>
          <Body muted style={{ fontSize: 13 }}>As of this morning. Orders below are settled tonight, in order, if the house can afford them.</Body>

          {orders.length > 0 ? <Heading>Tonight</Heading> : null}
          {orders.map((o) => (
            <Row key={o.id}>
              <Body style={{ flex: 1 }}>
                {orderLabel(o.kind, o.ref)} · {who(o.player_id)}
              </Body>
              {o.player_id === player.id && !locked ? <Button small kind="plain" label="Cancel" onPress={() => cancel(o.id)} /> : null}
            </Row>
          ))}

          {house.visitors.length > 0 ? <Heading>At the door</Heading> : null}
          {house.visitors.map((v) => {
            const t = VISITORS.find((x) => x.id === v.templateId);
            if (!t) return null;
            const answered = orders.find((o) => (o.kind === "accept" || o.kind === "decline") && o.ref === v.id);
            const served = orders.some((o) => o.kind === "serve" && o.ref === v.id);
            const platter = (house.stash.platter ?? 0) > orders.filter((o) => o.kind === "serve").length;
            return (
              <Card key={v.id}>
                <Body style={{ fontWeight: "700" }}>{t.name}</Body>
                <Body style={{ marginVertical: 6 }}>{t.line}</Body>
                <Body muted>
                  {t.quest.ask} {t.quest.coop ? "Together. " : ""}
                  {t.quest.days} days, from tomorrow. Reward: {describeReward(t.reward.resources, t.reward.recruit)}.
                </Body>
                <Body muted style={{ fontSize: 13 }}>Waiting until {v.leavesOn}.</Body>
                {answered ? (
                  <Body muted>{answered.kind === "accept" ? `${answered.player_id === player.id ? "You" : who(answered.player_id)} said yes. It starts tomorrow.` : "Turned away politely."}</Body>
                ) : locked ? null : (
                  <Row>
                    <Button small label="Accept" busy={action.busy} onPress={() => order("accept", v.id)} />
                    <Button small kind="plain" label="Not now" busy={action.busy} onPress={() => order("decline", v.id)} />
                    {platter && !served ? <Button small kind="plain" label="Serve a guest platter" busy={action.busy} onPress={() => order("serve", v.id)} /> : null}
                  </Row>
                )}
              </Card>
            );
          })}

          {house.quests.length > 0 ? <Heading>Quests</Heading> : null}
          {house.quests.map((q) => {
            const v = questView(q, data?.activity ?? [], today);
            if (!v) return null;
            return (
              <Card key={q.id}>
                <Body style={{ fontWeight: "700" }}>{v.ask}</Body>
                <Body muted>
                  For {v.name.charAt(0).toLowerCase() + v.name.slice(1)} · {q.startDate > today ? "starts tomorrow" : `${v.done} of ${v.target} so far, until ${q.endDate}`}
                  {q.acceptedBy !== player.id ? ` · ${who(q.acceptedBy)}'s` : ""}
                </Body>
              </Card>
            );
          })}

          <Heading>The Wandering Inn</Heading>
          {orders.some((o) => o.kind === "inn" && o.player_id === player.id) ? (
            <SystemBox lines={[]}>
              <Body>{innScene(player.id, today)}</Body>
              <Body muted style={{ marginTop: 6, fontSize: 13 }}>Someone from the Inn may come by tomorrow.</Body>
            </SystemBox>
          ) : locked ? (
            <Body muted>You're asleep.</Body>
          ) : (
            <Card onPress={() => order("inn", "inn")}>
              <Body style={{ fontWeight: "700" }}>Spend the evening up the hill</Body>
              <Body muted>A meal, a fire, the regulars. Earns a little goodwill, and someone from the Inn will come calling.</Body>
            </Card>
          )}

          {house.recruits.length > 0 ? <Heading>Helping out</Heading> : null}
          {house.recruits.map((id) => {
            const r = RECRUITS.find((x) => x.id === id);
            return r ? (
              <Body key={id}>
                {r.name}: {r.description}
              </Body>
            ) : null;
          })}

          <Heading>Upgrades</Heading>
          {UPGRADES.slice(1).map((u) => {
            const built = house.upgrades.includes(u.id);
            const ordered = orders.some((o) => o.kind === "build" && o.ref === u.id);
            const isNext = (next?.id === u.id || u.needsSkillTheme !== undefined) && !built && ladderReady(u, house.upgrades, UPGRADES);
            return (
              <Card key={u.id}>
                <Body style={{ fontWeight: "700", color: built ? t.good : t.text }}>
                  {built ? "✓ " : ""}
                  {u.name}
                </Body>
                <Body muted>{u.description}</Body>
                {!built ? <Body muted>Costs {cost(u.cost)}</Body> : null}
                {!built && isNext && !ordered && !locked ? (
                  <Button small kind={canAfford(house.resources, u.cost) ? "primary" : "plain"} label={canAfford(house.resources, u.cost) ? "Build tonight" : "Try tonight"} busy={action.busy} onPress={() => order("build", u.id)} />
                ) : null}
                {ordered ? <Body muted>Ordered for tonight.</Body> : null}
              </Card>
            );
          })}

          <Heading>{kitchen ? "Kitchen" : "Cookfire"}</Heading>
          {RECIPES.filter((r) => r.station === "cookfire" || kitchen).map((r) => (
            <Card key={r.id}>
              <Row>
                <Body style={{ fontWeight: "700", flex: 1 }}>{r.name}</Body>
                <Body muted>{masteryRank(house.mastery[r.id] ?? 0, DEFAULT_TUNING)}</Body>
              </Row>
              <Body muted>{r.description}</Body>
              <Row>
                <Body muted style={{ flex: 1 }}>{cost(r.cost)}</Body>
                {!locked ? <Button small kind="plain" label="Cook tonight" busy={action.busy} onPress={() => order("craft", r.id)} /> : null}
              </Row>
            </Card>
          ))}
          {!kitchen ? <Body muted>Build the kitchen for more recipes.</Body> : null}

          <Heading>Stash</Heading>
          {stash.length === 0 ? <Body muted>Empty for now. Outings and cooking fill it.</Body> : null}
          {stash.map(([id, n]) => {
            const def = ITEMS.find((i) => i.id === id);
            const eating = orders.filter((o) => o.kind === "meal" && o.ref === id).length;
            return (
              <Row key={id}>
                <Body style={{ flex: 1 }}>
                  {def?.name ?? id} ×{n}
                  {def?.stamina ? ` · +${def.stamina} stamina` : ""}
                </Body>
                {def?.stamina && n > eating && !locked ? <Button small kind="plain" label="Eat tonight" busy={action.busy} onPress={() => order("meal", id)} /> : null}
              </Row>
            );
          })}
        </>
      ) : null}

      <Heading>Who lives here</Heading>
      {data?.people.map((p) => (
        <Body key={p.id}>
          {p.display_name}
          {p.id === player.id ? " (you)" : ""} · {CLASS_PATHS.find((c) => c.id === p.class_path_id)?.name ?? "no path yet"}
        </Body>
      ))}
      {(data?.people.length ?? 0) >= 2 && !invite ? null : invite ? (
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
      <Field label="New room" value={room} onChangeText={setRoom} maxLength={40} />
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
