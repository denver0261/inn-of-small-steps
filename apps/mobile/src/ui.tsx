import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Night at the inn: a slate-blue night, candle gold and cream, after the serial's own site.
 * One palette on purpose. The game always happens after dark (decision 0018).
 */
const night = {
  bg: "#171c26",
  deep: "#0f1319",
  card: "#1f2733",
  raised: "#263040",
  text: "#f6f1ee",
  muted: "#9aa3ae",
  line: "#323d4d",
  /** Candle gold: actions, progress, what's yours to do. */
  accent: "#f7a71b",
  accentText: "#0f1319",
  /** Pale gold for titles and headings. */
  title: "#fcdca4",
  good: "#8fc77a",
  danger: "#f96854",
  /** The System's window: banner blue. */
  system: "#121b2b",
  systemEdge: "#5b86c5",
  systemText: "#e3ebf8",
};
export type Theme = typeof night;

export function useTheme(): Theme {
  return night;
}

/** Merriweather for the inn's voice; the system font for everything you read quickly. */
export const fonts = {
  display: "Merriweather_900Black",
  serifBold: "Merriweather_700Bold",
  serif: "Merriweather_400Regular",
  serifItalic: "Merriweather_400Regular_Italic",
} as const;

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

/** A small gold divider: a line, a diamond, a line. */
export function Ornament({ style }: { style?: object }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: t.accent, opacity: 0.35 }} />
      <View style={{ width: 7, height: 7, backgroundColor: t.accent, transform: [{ rotate: "45deg" }] }} />
      <View style={{ flex: 1, height: 1, backgroundColor: t.accent, opacity: 0.35 }} />
    </View>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.title, { color: t.title }]}>{children}</Text>
      {sub ? <Text style={{ color: t.muted, fontSize: 14, marginTop: 4 }}>{sub}</Text> : null}
      <Ornament style={{ marginTop: 12 }} />
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.headingRow}>
      <Text style={[styles.heading, { color: t.title }]}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
    </View>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.muted : t.text, fontSize: 16, lineHeight: 22 }, style]}>{children}</Text>;
}

/** Narration: the house's story, in the inn's serif. */
export function Prose({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme();
  return <Text style={[{ color: t.text, fontFamily: fonts.serif, fontSize: 15, lineHeight: 25 }, style]}>{children}</Text>;
}

export function Card({ children, onPress, glow }: { children: ReactNode; onPress?: () => void; glow?: boolean }) {
  const t = useTheme();
  const style = [styles.card, { backgroundColor: t.card, borderColor: glow ? t.accent : t.line }];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { borderColor: t.accent, backgroundColor: t.raised }]}>
      {children}
    </Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  busy,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "plain" | "danger";
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  const t = useTheme();
  const bg = kind === "primary" ? t.accent : "transparent";
  const fg = kind === "primary" ? t.accentText : kind === "danger" ? t.danger : t.accent;
  const edge = kind === "primary" ? bg : kind === "danger" ? t.danger : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: bg, borderColor: edge, opacity: disabled ? 0.4 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 16, letterSpacing: 0.3 }}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: t.muted, marginBottom: 6, fontSize: 14 }}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        keyboardAppearance="dark"
        accessibilityLabel={label}
        {...input}
        style={[styles.input, { color: t.text, backgroundColor: t.deep, borderColor: t.line }]}
      />
    </View>
  );
}

/** A row of choices: one selected by `value`, or several by `selected`. */
export function Choice<T extends string | number>({
  options,
  value,
  selected,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value?: T | undefined;
  selected?: readonly T[];
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value || (selected?.includes(o.value) ?? false);
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.card }]}
          >
            <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, fontWeight: on ? "700" : "400" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Gold for gains of rank (levels, classes), pale gold for Skills, the window's own color otherwise. */
export function systemLineColor(t: Theme, line: string): string {
  if (/Level \d+!|Class obtained|Class –|evolution/.test(line)) return t.accent;
  if (/Skill/.test(line)) return t.title;
  return t.systemText;
}

/** The System's voice: bracketed messages in a glowing blue window, the way the series prints them. */
export function SystemBox({ lines, children }: { lines: readonly string[]; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.system, { borderColor: t.systemEdge, backgroundColor: t.system, shadowColor: t.systemEdge }]}>
      {lines.map((line, i) => (
        <Text key={i} style={[styles.systemLine, { color: systemLineColor(t, line) }]}>
          {line}
        </Text>
      ))}
      {children}
    </View>
  );
}

/** A bar for progress toward the next level. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={[styles.track, { backgroundColor: t.deep, borderColor: t.line }]}>
        <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: t.accent, borderRadius: 5 }} />
      </View>
      {label ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 5 }}>{label}</Text> : null}
    </View>
  );
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  const t = useTheme();
  return error ? <Text style={{ color: t.danger, marginVertical: 8 }}>{error}</Text> : null;
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
      <ActivityIndicator color={t.accent} />
    </View>
  );
}

export function Row({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap, flexWrap: "wrap" }}>{children}</View>;
}

const styles = StyleSheet.create({
  system: { borderWidth: 1.5, borderRadius: 4, padding: 16, marginBottom: 14, gap: 4, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  systemLine: { fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 25 },
  body: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 30, fontFamily: fonts.display, lineHeight: 40 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22, marginBottom: 10 },
  heading: { fontSize: 13, fontFamily: fonts.serifBold, letterSpacing: 1.5, textTransform: "uppercase" },
  card: { borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 10 },
  button: { borderRadius: 6, borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", marginVertical: 4 },
  small: { paddingVertical: 7, paddingHorizontal: 12 },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 12 },
  track: { height: 12, borderRadius: 6, borderWidth: 1, overflow: "hidden", padding: 1 },
});
