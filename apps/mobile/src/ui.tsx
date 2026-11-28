import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// A warm inn palette: parchment by day, hearth-dark by night.
const light = {
  bg: "#f6f1e7",
  card: "#fffdf8",
  text: "#2b2118",
  muted: "#7a6a58",
  line: "#e4d9c6",
  accent: "#a5541b",
  accentText: "#fffaf2",
  good: "#4f7a3a",
  danger: "#a33b2b",
};
const dark: typeof light = {
  bg: "#1c1612",
  card: "#28201a",
  text: "#f2e8d9",
  muted: "#b3a28c",
  line: "#3d3229",
  accent: "#e08a45",
  accentText: "#1c1612",
  good: "#8fbf6e",
  danger: "#e0705e",
};
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.title, { color: t.text }]}>{children}</Text>
      {sub ? <Text style={{ color: t.muted, fontSize: 15, marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.heading, { color: t.muted }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.muted : t.text, fontSize: 16, lineHeight: 22 }, style]}>{children}</Text>;
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const style = [styles.card, { backgroundColor: t.card, borderColor: t.line }];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: bg, borderColor: kind === "primary" ? bg : t.line, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "600", fontSize: small ? 14 : 16 }}>{label}</Text>}
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
        accessibilityLabel={label}
        {...input}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.line }]}
      />
    </View>
  );
}

/** A row of choices; one selected. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.card }]}
          >
            <Text style={{ color: on ? t.accentText : t.text, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
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
  body: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 30, fontWeight: "700", fontFamily: "Georgia" },
  heading: { fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 10 },
  button: { borderRadius: 12, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", marginVertical: 4 },
  small: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
});
