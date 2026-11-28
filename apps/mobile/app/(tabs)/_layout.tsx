import { Redirect, Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useMorningReveal } from "../../src/morning/reveal.ts";
import { useSession } from "../../src/session.tsx";
import { fonts, useTheme } from "../../src/ui.tsx";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  const t = useTheme();
  const { ready, session, player, household } = useSession();
  useMorningReveal();
  if (ready && (!session || !player || !household || !player.class_path_id)) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.deep, borderTopColor: t.line },
        tabBarLabelStyle: { fontFamily: fonts.serifBold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: icon("☀︎") }} />
      <Tabs.Screen name="system" options={{ title: "System", tabBarIcon: icon("◈") }} />
      <Tabs.Screen name="habits" options={{ title: "Habits", tabBarIcon: icon("✦") }} />
      <Tabs.Screen name="chores" options={{ title: "Chores", tabBarIcon: icon("✓") }} />
      <Tabs.Screen name="house" options={{ title: "House", tabBarIcon: icon("⌂") }} />
    </Tabs>
  );
}
