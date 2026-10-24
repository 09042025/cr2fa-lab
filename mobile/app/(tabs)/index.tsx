import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../src/auth";
import { pct, usd } from "../../src/format";
import { C } from "../../src/theme";
import { useApi } from "../../src/useApi";
import type { MarketData } from "./mercado";
import { Card, GoldButton, H2, Muted, ProBadge, Screen } from "../../src/ui";

export default function Inicio() {
  const { user, isPro } = useAuth();
  const { data, loading } = useApi<MarketData>("/api/mobile/market");
  const btc = data?.coins?.find((c) => c.id === "bitcoin");
  return (
    <Screen title={`Olá, ${user?.name.split(" ")[0] ?? ""}`} subtitle="Resumo do seu hub de investimentos.">
      {!isPro && (
        <Card style={{ borderColor: C.gold }}>
          <Text style={{ color: C.goldSoft, fontWeight: "700" }}>Teste o Pró por 30 dias, sem pagar.</Text>
          <Muted>Libere Portfólio, Carteiras, Cursos, Lives VIP e todos os canais.</Muted>
          <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
        </Card>
      )}
      <Card onPress={() => router.push("/mercado")}>
        <H2>Bitcoin</H2>
        {btc ? (
          <>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: "700" }}>{usd(btc.priceUsd)}</Text>
            <Text style={{ color: (btc.change24h ?? 0) >= 0 ? C.up : C.down, fontWeight: "600" }}>{pct(btc.change24h)} nas últimas 24h</Text>
          </>
        ) : <Muted>{loading ? "Carregando…" : "Cotação indisponível agora."}</Muted>}
      </Card>
      <Card onPress={() => router.push("/cursos")}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><H2>Cursos</H2>{!isPro && <ProBadge />}</View>
        <Muted>Aulas em vídeo. Introdução liberada no Grátis.</Muted>
      </Card>
    </Screen>
  );
}
