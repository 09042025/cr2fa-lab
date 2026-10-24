import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth";
import { C } from "../src/theme";

function Routes() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={C.gold} size="large" /></View>;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.panel }, headerTintColor: C.goldSoft, contentStyle: { backgroundColor: C.ink } }}>
      {/* Só quem entrou vê o app */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="cursos" options={{ title: "Cursos" }} />
        <Stack.Screen name="planos" options={{ title: "Planos", presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Routes />
    </AuthProvider>
  );
}
