import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth";
import { C } from "../src/theme";

function Routes() {
  const { user } = useAuth();
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
