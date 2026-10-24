import { Image, Text, View } from "react-native";
import { ago, pct, usd } from "../../src/format";
import { C } from "../../src/theme";
import { useApi } from "../../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../../src/ui";
import { router } from "expo-router";

export interface Coin { id: string; symbol: string; name: string; priceUsd: number; change24h: number | null; change7d: number | null; image: string | null }
export interface MarketData { coins: Coin[]; limited: boolean; fetchedAt: number | null; stale: boolean; failed: boolean }

export default function Mercado() {
  const { data, error, loading, reload } = useApi<MarketData>("/api/mobile/market");
  return (
    <Screen title="Mercado" subtitle="Criptomoedas por valor de mercado, em dólar.">
      <Status loading={loading} error={error ?? (data?.failed ? "Não foi possível carregar as cotações agora." : null)} onRetry={reload} />
      {data?.coins?.map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {c.image ? <Image source={{ uri: c.image }} style={{ width: 32, height: 32, borderRadius: 16 }} /> : <View style={{ width: 32 }} />}
            <View style={{ flex: 1 }}><H2>{c.name}</H2><Muted>{c.symbol}</Muted></View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: C.white, fontWeight: "700" }}>{usd(c.priceUsd)}</Text>
              <Text style={{ color: (c.change24h ?? 0) >= 0 ? C.up : C.down, fontWeight: "600" }}>{pct(c.change24h)} <Text style={{ color: C.muted, fontWeight: "400" }}>24h</Text></Text>
            </View>
          </View>
        </Card>
      ))}
      {data?.limited && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><H2>Ranking completo no plano Pró</H2></View>
          <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
        </Card>
      )}
      {data?.fetchedAt ? <Muted>Atualizado {ago(data.fetchedAt)}.{data.stale ? " Mostrando o último dado salvo." : ""}</Muted> : null}
      {!loading && <GoldButton label="Atualizar" ghost onPress={reload} />}
    </Screen>
  );
}
