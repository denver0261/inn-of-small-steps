import { router } from "expo-router";
import { useState } from "react";
import { CLASS_PATHS } from "@inn/content";
import { updatePlayer } from "../../src/data/api.ts";
import { useAction, useSession } from "../../src/session.tsx";
import { Body, Button, Card, ErrorText, Screen, Title, useTheme } from "../../src/ui.tsx";

export default function Path() {
  const t = useTheme();
  const { player, refresh } = useSession();
  const [pick, setPick] = useState(player?.class_path_id ?? undefined);
  const { busy, error, run } = useAction();

  return (
    <Screen>
      <Title sub="Step 3 of 4. You can switch freely during your first 7 days.">Pick a path</Title>
      {CLASS_PATHS.map((p) => (
        <Card key={p.id} onPress={() => setPick(p.id)}>
          <Body style={{ fontWeight: "700", color: pick === p.id ? t.accent : t.text }}>{p.name}</Body>
          <Body muted>{p.blurb}</Body>
        </Card>
      ))}
      <Button
        label="Take this path"
        disabled={!pick || !player}
        busy={busy}
        onPress={() =>
          run(async () => {
            await updatePlayer(player!.id, { class_path_id: pick! });
            await refresh();
            router.replace("/setup/habits");
          })
        }
      />
      <ErrorText error={error} />
    </Screen>
  );
}
