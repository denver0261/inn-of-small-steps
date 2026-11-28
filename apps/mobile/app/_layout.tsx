import {
  Merriweather_400Regular,
  Merriweather_400Regular_Italic,
  Merriweather_700Bold,
  Merriweather_900Black,
  useFonts,
} from "@expo-google-fonts/merriweather";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../src/session.tsx";
import { Loading, useTheme } from "../src/ui.tsx";

export default function RootLayout() {
  const t = useTheme();
  const [loaded, failed] = useFonts({ Merriweather_400Regular, Merriweather_400Regular_Italic, Merriweather_700Bold, Merriweather_900Black });
  // If the fonts can't load, carry on in the system font rather than block the game.
  if (!loaded && !failed) return <Loading />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, statusBarStyle: "light", contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="morning" options={{ presentation: "fullScreenModal", animation: "fade", gestureEnabled: false }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
