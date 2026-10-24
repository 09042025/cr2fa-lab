import { Tabs } from "expo-router";
import { Text } from "react-native";
import { C } from "../../src/theme";

import type { ColorValue } from "react-native";
const icon = (g: string) => ({ color }: { color: ColorValue }) => <Text style={{ fontSize: 18, color }}>{g}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.goldSoft,
      tabBarInactiveTintColor: C.muted,
      tabBarStyle: { backgroundColor: C.panel, borderTopColor: C.line },
    }}>
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: icon("◆") }} />
      <Tabs.Screen name="mercado" options={{ title: "Mercado", tabBarIcon: icon("↗") }} />
      <Tabs.Screen name="comunidade" options={{ title: "Comunidade", tabBarIcon: icon("☰") }} />
      <Tabs.Screen name="portfolio" options={{ title: "Portfólio", tabBarIcon: icon("▣") }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: icon("☺") }} />
    </Tabs>
  );
}
