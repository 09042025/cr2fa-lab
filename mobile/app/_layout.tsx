import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth";
import { DrawerProvider } from "../src/drawer";
import { C } from "../src/theme";
import { Splash } from "../src/Splash";

function Routes() {
  const { user, loading } = useAuth();
  // A abertura fica na tela por pelo menos 2,2 s, para o zoom do logo aparecer mesmo com o app carregando rápido.
  const [min, setMin] = useState(true);
  useEffect(() => { const t = setTimeout(() => setMin(false), 2200); return () => clearTimeout(t); }, []);
  if (loading || min) return <Splash />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.panel }, headerTintColor: C.goldSoft, contentStyle: { backgroundColor: C.ink } }}>
      {/* Só quem entrou vê o app */}
      {/* Pública: a política abre com ou sem login */}
      <Stack.Screen name="membro" options={{ title: "Perfil" }} />
      <Stack.Screen name="privacidade" options={{ title: "Política de privacidade" }} />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="visao-geral" options={{ title: "Visão geral" }} />
        <Stack.Screen name="acoes" options={{ title: "Ações" }} />
        <Stack.Screen name="onchain" options={{ title: "Análise on Chain" }} />
        <Stack.Screen name="perfil-investidor" options={{ title: "Perfil de investidor" }} />
        <Stack.Screen name="noticias" options={{ title: "Notícias" }} />
        <Stack.Screen name="acao" options={{ title: "Ativo" }} />
        <Stack.Screen name="fiis" options={{ title: "Fundos imobiliários" }} />
        <Stack.Screen name="renda-fixa" options={{ title: "Renda fixa" }} />
        <Stack.Screen name="lives" options={{ title: "Lives Abertas" }} />
        <Stack.Screen name="live" options={{ title: "Live" }} />
        <Stack.Screen name="mensagens" options={{ title: "Mensagens" }} />
        <Stack.Screen name="conversa" options={{ title: "Conversa" }} />
        <Stack.Screen name="mentoria" options={{ title: "Mentoria com Niza" }} />
        <Stack.Screen name="salvos" options={{ title: "Posts Salvos" }} />
        <Stack.Screen name="cursos" options={{ title: "Masterclass" }} />
        <Stack.Screen name="defi" options={{ title: "HUB DEFI" }} />
        <Stack.Screen name="pool" options={{ title: "Pool" }} />
        <Stack.Screen name="saude" options={{ title: "Saúde das pools" }} />
        <Stack.Screen name="pools-position" options={{ title: "Pools Position" }} />
        <Stack.Screen name="saude-posicao" options={{ title: "Posição" }} />
        <Stack.Screen name="ativo/[id]" options={{ title: "Ativo" }} />
        <Stack.Screen name="cripto" options={{ title: "Cripto" }} />
        <Stack.Screen name="rwa" options={{ title: "RWA" }} />
        <Stack.Screen name="futuros" options={{ title: "Futuros" }} />
        <Stack.Screen name="etf" options={{ title: "ETFs de Cripto" }} />
        <Stack.Screen name="plataformas" options={{ title: "DEX e Plataformas" }} />
        <Stack.Screen name="configuracoes" options={{ title: "Configurações" }} />
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
      <DrawerProvider><Routes /></DrawerProvider>
    </AuthProvider>
  );
}
