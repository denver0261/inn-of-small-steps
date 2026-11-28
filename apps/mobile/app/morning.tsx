import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { classPath } from "@inn/content";
import { DEFAULT_TUNING, type PlayerState } from "@inn/engine";
import { getMyState, getNames, listMornings, type Morning } from "../src/data/api.ts";
import { displayClass, levelProgress } from "../src/game/character.ts";
import { LINE_PAUSE_MS, lineKind, TYPE_MS } from "../src/game/morning.ts";
import { markMorningSeen } from "../src/morning/reveal.ts";
import { useSession } from "../src/session.tsx";
import { Button, fonts, Loading, Ornament, systemLineColor, useTheme } from "../src/ui.tsx";

type Phase = "lines" | "stats" | "scene" | "done";

/** The morning, played out: the System's lines type in one by one, then the level bar fills, then the house's scene. */
export default function MorningReveal() {
  const t = useTheme();
  const { player, household } = useSession();
  const [data, setData] = useState<{ morning: Morning | undefined; state: PlayerState; cls: string } | undefined>();
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<Phase>("lines");
  const bar = useRef(new Animated.Value(0)).current;
  const stats = useRef(new Animated.Value(0)).current;
  const scene = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!player) return;
    void (async () => {
      const [mornings, state, names] = await Promise.all([listMornings(1), getMyState(), getNames(player.id)]);
      const base = player.class_path_id ? classPath(player.class_path_id).name : "[Earther]";
      setData({ morning: mornings[0], state, cls: displayClass(base, state, names.evolutions) });
    })().catch(() => close());
  }, [player?.id]);

  const lines = (player && data?.morning?.messages[player.id]) ?? [];
  const progress = data ? levelProgress(data.state, DEFAULT_TUNING) : undefined;

  // Type the current line, then pause, then the next. A haptic marks each line; a stronger one marks a level.
  useEffect(() => {
    if (!data || phase !== "lines") return;
    if (line >= lines.length) {
      const id = setTimeout(() => setPhase("stats"), 250);
      return () => clearTimeout(id);
    }
    const text = lines[line] ?? "";
    if (chars < text.length) {
      const id = setTimeout(() => setChars((c) => Math.min(text.length, c + 2)), TYPE_MS);
      return () => clearTimeout(id);
    }
    const kind = lineKind(text);
    if (kind === "level" || kind === "class") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.impactAsync(kind === "skill" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const id = setTimeout(() => (setLine((l) => l + 1), setChars(0)), LINE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [data, phase, line, chars]);

  useEffect(() => {
    if (phase === "stats" && progress) {
      Animated.sequence([
        Animated.timing(stats, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(bar, { toValue: progress.share, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(({ finished }) => finished && setPhase("scene"));
    }
    if (phase === "scene") Animated.timing(scene, { toValue: 1, duration: 700, useNativeDriver: false }).start(({ finished }) => finished && setPhase("done"));
  }, [phase]);

  const skip = () => {
    if (phase === "done" || !progress) return;
    setLine(lines.length);
    stats.setValue(1);
    bar.setValue(progress.share);
    scene.setValue(1);
    setPhase("done");
  };

  function close() {
    if (player && data?.morning) void markMorningSeen(player.id, data.morning.date);
    if (router.canGoBack()) router.back();
    else router.replace("/today");
  }

  if (!data || !player) return <Loading />;
  const level = data.state.progress.level;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.deep }}>
      <Pressable style={{ flex: 1 }} onPress={skip} accessibilityLabel="Show the whole morning">
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.kicker, { color: t.accent }]}>Morning</Text>
          <Text style={[styles.house, { color: t.title }]}>{household?.name ?? "The Inn"}</Text>
          <Text style={[styles.date, { color: t.muted }]}>{data.morning?.date}</Text>
          <Ornament style={{ marginVertical: 20, marginHorizontal: 40 }} />

          {lines.length > 0 ? (
            <View style={[styles.window, { backgroundColor: t.system, borderColor: t.systemEdge, shadowColor: t.systemEdge }]}>
              {lines.slice(0, Math.min(line, lines.length)).map((l, i) => (
                <ShownLine key={i} text={l} color={systemLineColor(t, l)} />
              ))}
              {phase === "lines" && line < lines.length ? (
                <Text style={[styles.line, { color: systemLineColor(t, lines[line] ?? "") }]}>
                  {(lines[line] ?? "").slice(0, chars)}
                  <Text style={{ color: t.systemEdge }}>▍</Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          <Animated.View style={[styles.stats, { backgroundColor: t.card, borderColor: t.line, opacity: stats, transform: [{ translateY: stats.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
            <Text style={[styles.cls, { color: t.title }]}>{data.cls}</Text>
            <Text style={[styles.level, { color: t.accent }]}>{level > 0 ? `Level ${level}` : "No level yet"}</Text>
            {progress && level > 0 ? (
              <>
                <View style={[styles.track, { backgroundColor: t.deep, borderColor: t.line }]}>
                  <Animated.View style={{ height: "100%", borderRadius: 6, backgroundColor: t.accent, width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
                </View>
                <Text style={{ color: t.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  {progress.into} of {progress.need} XP toward Level {level + 1}
                </Text>
              </>
            ) : null}
          </Animated.View>

          {data.morning?.scene ? (
            <Animated.Text style={[styles.scene, { color: t.text, opacity: scene }]}>{data.morning.scene}</Animated.Text>
          ) : null}

          <View style={{ marginTop: 28, opacity: phase === "done" ? 1 : 0 }}>
            <Button label="Begin the day" onPress={close} disabled={phase !== "done"} />
          </View>
          {phase !== "done" ? <Text style={{ color: t.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>Tap to show it all</Text> : null}
        </ScrollView>
      </Pressable>
    </SafeAreaView>
  );
}

/** A finished line settles into place; levels and classes land with a small swell. */
function ShownLine({ text, color }: { text: string; color: string }) {
  const kind = lineKind(text);
  const big = kind === "level" || kind === "class";
  const scale = useRef(new Animated.Value(big ? 1.12 : 1)).current;
  useEffect(() => {
    if (big) Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, []);
  return <Animated.Text style={[styles.line, big && styles.bigLine, { color, transform: [{ scale }] }]}>{text}</Animated.Text>;
}

const styles = StyleSheet.create({
  body: { padding: 24, paddingTop: 36, paddingBottom: 48 },
  kicker: { fontFamily: fonts.serifBold, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", textAlign: "center" },
  house: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40, textAlign: "center", marginTop: 6 },
  date: { fontFamily: fonts.serifItalic, fontSize: 14, textAlign: "center", marginTop: 2 },
  window: { borderWidth: 1.5, borderRadius: 4, padding: 18, gap: 6, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, marginBottom: 22 },
  line: { fontFamily: fonts.serifBold, fontSize: 17, lineHeight: 27 },
  bigLine: { fontSize: 19 },
  stats: { borderWidth: 1, borderRadius: 8, padding: 18, alignItems: "stretch" },
  cls: { fontFamily: fonts.display, fontSize: 22, lineHeight: 30, textAlign: "center" },
  level: { fontFamily: fonts.serifBold, fontSize: 16, textAlign: "center", marginTop: 4, marginBottom: 12 },
  track: { height: 14, borderRadius: 7, borderWidth: 1, overflow: "hidden", padding: 1 },
  scene: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 27, marginTop: 24 },
});
