import { useMemo, useState } from "react";
import { PixelRatio, View } from "react-native";
import { INN_SPOTS, SCENE_HEIGHT, SCENE_WIDTH } from "@inn/content";
import { composeInn, visitorPixels } from "./game/innScene.ts";
import { playerSprite } from "./game/sprite.ts";
import { PixelSprite } from "./sprite.tsx";
import { useTheme } from "./ui.tsx";

interface Member {
  id: string;
  class_path_id: string | null;
}

/** The house at night as it stands now, with the two of you out front and anyone waiting at the door. */
export function InnScene({ upgrades, players, visitors }: { upgrades: readonly string[]; players: readonly Member[]; visitors: number }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  // Whole device pixels per scene pixel, so rows meet without seams.
  const ratio = PixelRatio.get();
  const scale = width > 0 ? Math.floor((width / SCENE_WIDTH) * ratio) / ratio : 0;
  // Center the scene; the few points left over become a dark margin.
  const left = Math.max(0, (width - scale * SCENE_WIDTH) / 2);
  const scene = useMemo(() => composeInn(upgrades), [upgrades.join(",")]);
  const visitor = useMemo(visitorPixels, []);
  const sprites = useMemo(() => players.slice(0, INN_SPOTS.players.length).map(playerSprite), [players.map((p) => p.id + p.class_path_id).join(",")]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ borderRadius: 8, borderWidth: 1, borderColor: t.line, overflow: "hidden", marginBottom: 14, height: scale > 0 ? scale * SCENE_HEIGHT : 240, backgroundColor: "#0b1020" }}
    >
      {scale > 0 ? (
        <>
          <View style={{ position: "absolute", left, top: 0 }}>
            <PixelSprite pixels={scene} scale={scale} bob={false} shadow={false} />
          </View>
          {visitors > 0 ? (
            <View style={{ position: "absolute", left: left + INN_SPOTS.visitor[0] * scale, top: INN_SPOTS.visitor[1] * scale }}>
              <PixelSprite pixels={visitor} scale={scale} delay={600} />
            </View>
          ) : null}
          {sprites.map((px, i) => {
            const spot = INN_SPOTS.players[i];
            return spot ? (
              <View key={i} style={{ position: "absolute", left: left + spot[0] * scale, top: spot[1] * scale }}>
                <PixelSprite pixels={px} scale={scale} delay={i * 350} />
              </View>
            ) : null;
          })}
        </>
      ) : null}
    </View>
  );
}
