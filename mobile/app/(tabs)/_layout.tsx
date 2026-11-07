import { Tabs } from "expo-router";
import { Text } from "react-native";
import { AppHeader } from "../../src/drawer";
import { NoTopInset } from "../../src/ui";
import { C } from "../../src/theme";

import type { ColorValue } from "react-native";
const icon = (g: string) => ({ color }: { color: ColorValue }) => <Text style={{ fontSize: 18, color }}>{g}</Text>;

export default function TabsLayout() {
  return (
    <NoTopInset.Provider value={true}>
    <Tabs screenOptions={{
      header: () => <AppHeader />,
      tabBarActiveTintColor: C.goldSoft,
      tabBarInactiveTintColor: C.muted,
      tabBarStyle: { display: "none" },
    }}>
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: icon("◆") }} />
      <Tabs.Screen name="mercado" options={{ title: "Mercado Cripto", tabBarIcon: icon("↗") }} />
      <Tabs.Screen name="comunidade" options={{ title: "White Flame Society", tabBarIcon: icon("☰") }} />
      <Tabs.Screen name="portfolio" options={{ title: "Portfólio", tabBarIcon: icon("▣") }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: icon("≡") }} />
    </Tabs>
    </NoTopInset.Provider>
  );
}
