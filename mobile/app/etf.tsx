import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { CriptoNav } from "../src/criptoNav";
import { usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Data {
  pro: boolean; asset: "btc" | "eth"; funds: string[] | null;
  last: { date: string; total: number | null } | null; sum7: number; sum30: number; cum: number;
  days: { label: string; total: number }[]; group?: string; period?: string;
  table: { date: string; flows: (number | null)[]; total: number | null }[] | null;
}
// Farside informa em milhões de dólares.
const mi = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${usdCompact(Math.abs(v) * 1e6)}`);
const tone = (v: number | null) => ((v ?? 0) >= 0 ? C.up : C.down);
const dt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

const PERIODS = [["30d", "30 dias"], ["90d", "90 dias"], ["6m", "6 meses"], ["1a", "1 ano"], ["tudo", "Tudo"]];
const GROUPS = [["dia", "Dias"], ["mes", "Meses"], ["ano", "Anos"]];
const Chip = ({ label, on, onPress, small }: { label: string; on: boolean; onPress: () => void; small?: boolean }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: small ? 10 : 14, paddingVertical: small ? 6 : 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", fontSize: small ? 12 : 14 }}>{label}</Text>
  </Pressable>
);

export default function Etf() {
  const [a, setA] = useState<"btc" | "eth">("btc");
  const [p, setP] = useState("90d");
  const [g, setG] = useState("dia");
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/etf?a=${a}&p=${p}&g=${g}`);
  const max = data ? Math.max(1, ...data.days.map((d) => Math.abs(d.total))) : 1;
  return (
    <Screen title="ETFs de Cripto" subtitle="Quanto dinheiro entra e sai dos ETFs de Bitcoin e Ethereum nos EUA, dia a dia.">
      <CriptoNav current="/etf" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["btc", "eth"] as const).map((x) => <Chip key={x} label={x === "btc" ? "Bitcoin" : "Ethereum"} on={a === x} onPress={() => setA(x)} />)}
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
            <H2>Fluxo {g === "mes" && data.pro ? "mensal" : g === "ano" && data.pro ? "anual" : "diário"} ({data.days.length} {g === "mes" && data.pro ? "meses" : g === "ano" && data.pro ? "anos" : "pregões"})</H2>
            {data.pro ? (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}><Text style={{ color: C.muted, fontSize: 12 }}>Agrupar</Text>{GROUPS.map(([k, l]) => <Chip key={k} small label={l} on={g === k} onPress={() => setG(k)} />)}</View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}><Text style={{ color: C.muted, fontSize: 12 }}>Período</Text>{PERIODS.map(([k, l]) => <Chip key={k} small label={l} on={p === k} onPress={() => setP(k)} />)}</View>
              </View>
            ) : <Muted>Filtros de dias, meses e anos no plano Premium.</Muted>}
            <View style={{ height: 120, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
              {data.days.map((d) => <View key={d.label} style={{ flex: 1, height: `${Math.max(3, (Math.abs(d.total) / max) * 100)}%`, backgroundColor: tone(d.total), borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />)}
            </View>
            <Muted>Verde = entrada de dinheiro, vermelho = saída. Valores em dólares.</Muted>
            {!data.pro && <Muted>Histórico completo e fluxo por fundo no plano Premium.</Muted>}
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
          <Pressable onPress={() => Linking.openURL("https://coinmarketcap.com/etf/")}><Text style={{ color: C.gold, fontWeight: "700" }}>Painel de ETFs do CoinMarketCap ↗</Text></Pressable>
          <Muted>Fonte: Farside Investors. Conteúdo educativo, não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
