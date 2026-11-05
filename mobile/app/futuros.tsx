import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CriptoNav } from "../src/criptoNav";
import { usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Data { pro: boolean; enabled: boolean; asset: "BTC" | "ETH"; interval: "daily" | "1hour"; longs24?: number; shorts24?: number; total7?: number | null; pts?: { t: number; l: number; s: number }[] }
const Chip = ({ label, on, locked, onPress }: { label: string; on: boolean; locked?: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2, opacity: locked ? 0.55 : 1 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{label}{locked ? " 🔒" : ""}</Text>
  </Pressable>
);

export default function Futuros() {
  const [a, setA] = useState("btc");
  const [i, setI] = useState("daily");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/futuros?a=${a}&i=${i}`);
  const pro = data?.pro ?? false;
  const pts = data?.pts ?? [];
  const max = Math.max(1, ...pts.map((p) => p.l + p.s));
  const gate = () => router.push("/planos");
  return (
    <Screen title="Futuros" subtitle="Liquidações forçadas em contratos futuros: mostram onde apostas alavancadas foram zeradas.">
      <CriptoNav current="/futuros" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip label="Bitcoin" on={a === "btc"} onPress={() => setA("btc")} />
        <Chip label="Ethereum" on={a === "eth"} locked={!pro} onPress={() => (pro ? setA("eth") : gate())} />
        <Chip label="Diário" on={i === "daily"} onPress={() => setI("daily")} />
        <Chip label="Por hora" on={i === "1hour"} locked={!pro} onPress={() => (pro ? setI("1hour") : gate())} />
      </View>
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && !data.enabled && <Card><Muted>Os dados de futuros ainda não estão ativados no servidor.</Muted></Card>}
      {data?.enabled && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Card style={{ width: "48.5%", padding: 12 }}><Text style={{ color: C.muted, fontSize: 12 }}>Longs liquidados (24h)</Text><Text style={{ color: C.down, fontSize: 18, fontWeight: "700" }}>{usdCompact(data.longs24 ?? 0)}</Text></Card>
            <Card style={{ width: "48.5%", padding: 12 }}><Text style={{ color: C.muted, fontSize: 12 }}>Shorts liquidados (24h)</Text><Text style={{ color: C.up, fontSize: 18, fontWeight: "700" }}>{usdCompact(data.shorts24 ?? 0)}</Text></Card>
          </View>
          <Card>
            <H2>Liquidações {i === "daily" ? `(${pts.length} dias)` : "(últimas 48h)"}</H2>
            <View style={{ height: 130, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
              {pts.map((p) => (
                <View key={p.t} style={{ flex: 1, height: `${Math.max(2, ((p.l + p.s) / max) * 100)}%`, justifyContent: "flex-end" }}>
                  <View style={{ flex: p.s, backgroundColor: C.up }} /><View style={{ flex: p.l, backgroundColor: C.down }} />
                </View>
              ))}
            </View>
            <Muted>Vermelho = posições compradas (long) liquidadas; verde = vendidas (short). {data.total7 ? `Total em 7 dias: ${usdCompact(data.total7)}.` : ""}</Muted>
          </Card>
          {!pro && (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><H2>Ethereum, dados por hora e 90 dias</H2></View>
              <GoldButton label="Ver planos" onPress={gate} />
            </Card>
          )}
          <Muted>Fonte: Coinalyze. Conteúdo educativo, não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
