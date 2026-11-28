import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { classPath } from "@inn/content";
import { playerSprite, runs, type Pixels } from "./game/sprite.ts";
import { useTheme } from "./ui.tsx";

/** A pixel drawing, each row merged into runs of one color. `bob` makes it breathe in place. */
export function PixelSprite({ pixels, scale = 4, bob = true, delay = 0 }: { pixels: Pixels; scale?: number; bob?: boolean; delay?: number }) {
  const rows = useMemo(() => pixels.map(runs), [pixels]);
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!bob) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(lift, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);
  const width = (pixels[0]?.length ?? 0) * scale;
  return (
    <View style={{ width, alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -scale] }) }] }}>
        {rows.map((row, y) => (
          <View key={y} style={{ flexDirection: "row", height: scale }}>
            {row.map((r, i) => (
              <View key={i} style={{ width: r.length * scale, height: scale, backgroundColor: r.color ?? "transparent" }} />
            ))}
          </View>
        ))}
      </Animated.View>
      <View style={{ width: width * 0.55, height: scale * 1.2, borderRadius: scale, backgroundColor: "#000", opacity: 0.35, marginTop: -scale * 0.6 }} />
    </View>
  );
}

interface Member {
  id: string;
  display_name: string;
  class_path_id: string | null;
}

/** A player's character with their name and class under it. */
export function Character({ player, scale = 4, you, delay }: { player: Member; scale?: number; you?: boolean; delay?: number }) {
  const t = useTheme();
  const pixels = useMemo(() => playerSprite(player), [player.id, player.class_path_id]);
  const cls = player.class_path_id ? classPath(player.class_path_id).name : "[Earther]";
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <PixelSprite pixels={pixels} scale={scale} delay={delay} />
      <Text style={{ color: you ? t.accent : t.text, fontWeight: "700", fontSize: 13 }}>{player.display_name}</Text>
      <Text style={{ color: "#d6c3a5", fontSize: 11 }}>{cls}</Text>
    </View>
  );
}

/** The common room: a lamplit wall and floorboards for characters to stand on. */
export function Stage({ children, floor = 48 }: { children: ReactNode; floor?: number }) {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 8, borderWidth: 1, borderColor: t.line, overflow: "hidden", marginBottom: 14, backgroundColor: "#2b3445" }}>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: floor, backgroundColor: "#4a3526" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ height: 1, marginTop: i === 0 ? 0 : floor / 3 - 1, backgroundColor: "#3a2a1d" }} />
        ))}
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: floor, height: 3, backgroundColor: "#5c4330" }} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 32, paddingTop: 16, paddingBottom: 8 }}>{children}</View>
    </View>
  );
}

/** Everyone in the house, standing together. */
export function Party({ players, me, scale = 4 }: { players: readonly Member[]; me: string; scale?: number }) {
  const ordered = [...players].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0));
  return (
    <Stage>
      {ordered.map((p, i) => (
        <Character key={p.id} player={p} scale={scale} you={p.id === me} delay={i * 350} />
      ))}
    </Stage>
  );
}
