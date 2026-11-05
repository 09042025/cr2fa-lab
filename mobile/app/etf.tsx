import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CriptoNav } from "../src/criptoNav";
import { usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Data {
  pro: boolean; asset: "btc" | "eth"; funds: string[] | null;
  last: { date: string; total: number | null } | null; sum7: number; sum30: number; cum: number;
  days: { date: string; total: number }[];
  table: { date: string; flows: (number | null)[]; total: number | null }[] | null;
}
// Farside informa em milhões de dólares.
const mi = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${usdCompact(Math.abs(v) * 1e6)}`);
const tone = (v: number | null) => ((v ?? 0) >= 0 ? C.up : C.down);
const dt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export default function Etf() {
  const [a, setA] = useState<"btc" | "eth">("btc");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/etf?a=${a}`);
  const max = data ? Math.max(1, ...data.days.map((d) => Math.abs(d.total))) : 1;
  return (
    <Screen title="ETFs de Cripto" subtitle="Quanto dinheiro entra e sai dos ETFs de Bitcoin e Ethereum nos EUA, dia a dia.">
      <CriptoNav current="/etf" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["btc", "eth"] as const).map((x) => (
          <Pressable key={x} onPress={() => setA(x)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: a === x ? C.gold : C.line, backgroundColor: a === x ? C.gold : C.panel2 }}>
            <Text style={{ color: a === x ? C.ink : C.white, fontWeight: "700" }}>{x === "btc" ? "Bitcoin" : "Ethereum"}</Text>
          </Pressable>
        ))}
      </View>
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[["Último dia" + (data.last ? ` (${dt(data.last.date)})` : ""), data.last?.total ?? null], ["Últimos 7 pregões", data.sum7], ["Últimos 30 pregões", data.sum30], ["Acumulado", data.cum]].map(([l, v]) => (
              <Card key={l as string} style={{ width: "48.5%", padding: 12 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>{l as string}</Text>
                <Text style={{ color: tone(v as number | null), fontSize: 18, fontWeight: "700" }}>{mi(v as number | null)}</Text>
              </Card>
            ))}
          </View>
          <Card>
            <H2>Fluxo diário ({data.days.length} pregões)</H2>
            <View style={{ height: 120, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
              {data.days.map((d) => <View key={d.date} style={{ flex: 1, height: `${Math.max(3, (Math.abs(d.total) / max) * 100)}%`, backgroundColor: tone(d.total), borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />)}
            </View>
            <Muted>Verde = entrada de dinheiro, vermelho = saída. Valores em dólares.</Muted>
            {!data.pro && <Muted>Histórico de 90 pregões e fluxo por fundo no plano Premium.</Muted>}
          </Card>
          {data.table ? (
            <Card>
              <H2>Por dia (últimos 30 pregões)</H2>
              {data.table.map((r) => (
                <View key={r.date} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: C.muted }}>{dt(r.date)}</Text>
                  <Text style={{ color: tone(r.total), fontWeight: "600" }}>{mi(r.total)}</Text>
                </View>
              ))}
              {data.funds && <Muted>Fundos: {data.funds.join(", ")}.</Muted>}
            </Card>
          ) : (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><H2>Fluxo por fundo e histórico longo</H2></View>
              <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
            </Card>
          )}
          <Muted>Fonte: Farside Investors. Conteúdo educativo, não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
