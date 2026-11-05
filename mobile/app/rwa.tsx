import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { CriptoNav } from "../src/criptoNav";
import { pct, usd, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, Muted, Screen, Status } from "../src/ui";

interface Coin { id: string; symbol: string; name: string; priceUsd: number; change24h: number | null; marketCapUsd: number | null; image: string | null }
interface Data { pro: boolean; group: { id: string; hint: string }; groups: { id: string; label: string }[]; coins: Coin[]; total: number; freeLimit: number }

export default function Rwa() {
  const [g, setG] = useState("stocks");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/rwa?g=${g}`);
  return (
    <Screen title="RWA e ativos tokenizados" subtitle="Ações, ouro, commodities e outros ativos do mundo real representados em token na blockchain.">
      <CriptoNav current="/rwa" />
      {data && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {data.groups.map((x) => (
            <Pressable key={x.id} onPress={() => setG(x.id)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: x.id === g ? C.gold : C.line, backgroundColor: x.id === g ? C.gold : C.panel2 }}>
              <Text style={{ color: x.id === g ? C.ink : C.white, fontWeight: "700" }}>{x.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Muted>{data.group.hint}</Muted>
          <Card style={{ paddingVertical: 4 }}>
            {data.coins.length === 0 && <Muted>Nenhum ativo nesta categoria agora.</Muted>}
            {data.coins.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: "/ativo/[id]", params: { id: c.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
                {c.image ? <Image source={{ uri: c.image }} style={{ width: 28, height: 28, borderRadius: 14 }} /> : <View style={{ width: 28 }} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.white, fontWeight: "600" }} numberOfLines={1}>{c.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{c.symbol.toUpperCase()}{c.marketCapUsd ? ` · ${usdCompact(c.marketCapUsd)}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.white }}>{usd(c.priceUsd)}</Text>
                  <Text style={{ color: (c.change24h ?? 0) >= 0 ? C.up : C.down, fontWeight: "600", fontSize: 12 }}>{pct(c.change24h)}</Text>
                </View>
              </Pressable>
            ))}
          </Card>
          {!data.pro && data.total > data.coins.length && (
            <Card style={{ gap: 10 }}>
              <Text style={{ color: C.white }}>Mostrando {data.coins.length} de {data.total} ativos. A lista completa é do plano Premium.</Text>
              <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
            </Card>
          )}
          <Muted>Ativos tokenizados dependem da empresa emissora e podem não dar os mesmos direitos do ativo original (como dividendos e voto). Conteúdo educativo, não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
