import { router } from "expo-router";
import { Text, View } from "react-native";
import { UPGRADES } from "@inn/content";
import { canAfford, DEFAULT_TUNING, nextUpgrade } from "@inn/engine";
import { getHouse, getMyState, listHabits, listHousemates, listLogs, listMyOutings } from "../../src/data/api.ts";
import { staminaLeft } from "../../src/game/house.ts";
import { InnScene } from "../../src/innScene.tsx";
import { useData, useSession } from "../../src/session.tsx";
import { Body, Button, Card, ErrorText, fonts, Row, Screen, Title, useTheme } from "../../src/ui.tsx";

/** Home: the house as it stands tonight, who's at the door, and what's waiting for you. */
export default function Inn() {
  const t = useTheme();
  const { player, household, today } = useSession();
  const { data, error } = useData(async () => {
    const [house, people, habits, logs, state, outings] = await Promise.all([
      getHouse(),
      listHousemates(),
      listHabits(),
      listLogs(today, today),
      getMyState(),
      player ? listMyOutings(player.id, today) : Promise.resolve([]),
    ]);
    return { house, people, habits, logs, state, outings };
  }, [today]);
  if (!player || !household) return null;

  const house = data?.house;
  const mine = data?.habits.filter((h) => h.playerId === player.id) ?? [];
  const done = mine.filter((h) => data?.logs.some((l) => l.habitId === h.id)).length;
  const nextDef = house ? nextUpgrade(house, UPGRADES) : undefined;
  const stamina = data ? staminaLeft(data.state, data.outings.length, DEFAULT_TUNING) : 0;
  const visitors = house?.visitors.length ?? 0;

  return (
    <Screen>
      <Title sub={`Liscor · ${today}`}>{household.name}</Title>
      <ErrorText error={error} />
      {house && data ? <InnScene upgrades={house.upgrades} players={[...data.people].sort((a, b) => (a.id === player.id ? -1 : b.id === player.id ? 1 : 0))} visitors={visitors} /> : <View style={{ height: 240 }} />}

      {house ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
          <Stat label="Coins" value={house.resources.coins} />
          <Stat label="Supplies" value={house.resources.supplies} />
          <Stat label="Mana" value={house.resources.mana} />
          <Stat label="Goodwill" value={house.resources.goodwill} />
        </View>
      ) : null}

      <Card onPress={() => router.navigate("/today")} glow={mine.length > 0 && done < mine.length}>
        <Row>
          <Body style={{ fontWeight: "700", flex: 1 }}>Today's work</Body>
          <Body muted>
            {done} of {mine.length}
          </Body>
        </Row>
        <Body muted>{mine.length === 0 ? "No habits yet." : done === mine.length ? "All done. Rest easy tonight." : "Habits to log before you sleep."}</Body>
      </Card>

      {visitors > 0 ? (
        <Card onPress={() => router.push("/house")} glow>
          <Body style={{ fontWeight: "700" }}>{visitors === 1 ? "Someone's at the door" : `${visitors} visitors at the door`}</Body>
          <Body muted>They've come with an offer. See what they want.</Body>
        </Card>
      ) : null}

      {data && data.state.progress.level > 0 ? (
        <Card onPress={() => router.push("/outing")}>
          <Row>
            <Body style={{ fontWeight: "700", flex: 1 }}>Around Liscor</Body>
            <Body muted>Stamina {stamina}</Body>
          </Row>
          <Body muted>Errands, foraging, the odd rock crab.</Body>
        </Card>
      ) : null}

      {house && nextDef ? (
        <Card onPress={() => router.push("/house")}>
          <Row>
            <Body style={{ fontWeight: "700", flex: 1 }}>Next: {nextDef.name}</Body>
            <Body style={{ color: canAfford(house.resources, nextDef.cost) ? t.good : t.muted }}>{canAfford(house.resources, nextDef.cost) ? "Ready" : "Saving up"}</Body>
          </Row>
          <Body muted>{nextDef.description}</Body>
        </Card>
      ) : null}

      <Button kind="plain" label="Manage the house" onPress={() => router.push("/house")} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: t.title, fontFamily: fonts.serifBold, fontSize: 20 }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
