import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { pct, usd, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProBadge, Screen, Status } from "../src/ui";

interface Mini { id: string; symbol: string; name: string; priceUsd: number; change24h: number | null; image: string | null }
interface Data {
  pro: boolean; days: number;
  global: { totalCapUsd: number | null; totalVolumeUsd: number | null; capChange24h: number | null; btcDominance: number | null; ethDominance: number | null; activeCoins: number | null } | null;
  others: number | null;
  fng: { value: number; label: string; history: number[] } | null;
  altIndex: number | null;
  cap: number[];
  gainers: Mini[] | null; losers: Mini[] | null;
}

// Mesmas seções do site (Cripto). "to" = já nativo no app; sem "to" = próxima etapa.
const SECOES: { label: string; pro?: boolean; to?: "/mercado" | "/defi" }[] = [
  { label: "Visão de mercado" },
  { label: "Mercado", to: "/mercado" },
  { label: "HUB DEFI", pro: true, to: "/defi" },
  { label: "RWA" },
  { label: "Futuros" },
  { label: "ETFs de Cripto" },
  { label: "Análise on Chain", pro: true },
  { label: "DEX e Plataformas DeFi" },
];
const PERIODS = [{ d: 7, l: "7d" }, { d: 30, l: "30d" }, { d: 90, l: "90d" }, { d: 365, l: "1a" }];
const fngColor = (v: number) => (v < 25 ? "#ef4444" : v < 45 ? "#f59e0b" : v < 55 ? "#9ca3af" : v < 75 ? "#84cc16" : "#22c55e");
const br1 = (v: number) => v.toFixed(1).replace(".", ",");

function Bars({ values, color, height }: { values: number[]; color?: (v: number) => string; height: number }) {
  const min = Math.min(...values), max = Math.max(...values);
  const up = values[values.length - 1] >= values[0];
  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
      {values.map((v, i) => <View key={i} style={{ flex: 1, height: `${Math.max(4, ((v - min) / (max - min || 1)) * 100)}%`, backgroundColor: color ? color(v) : up ? C.up : C.down, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />)}
    </View>
  );
}

function Movers({ title, list, tone }: { title: string; list: Mini[]; tone: string }) {
  return (
    <Card>
      <Text style={{ color: tone, fontWeight: "700", fontSize: 16 }}>{title}</Text>
      {list.map((c) => (
        <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
          {c.image ? <Image source={{ uri: c.image }} style={{ width: 26, height: 26, borderRadius: 13 }} /> : <View style={{ width: 26 }} />}
          <View style={{ flex: 1 }}><Text style={{ color: C.white, fontWeight: "600" }}>{c.name}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{c.symbol}</Text></View>
          <View style={{ alignItems: "flex-end" }}><Text style={{ color: C.white }}>{usd(c.priceUsd)}</Text><Text style={{ color: tone, fontWeight: "600", fontSize: 12 }}>{pct(c.change24h)}</Text></View>
        </View>
      ))}
    </Card>
  );
}

export default function Cripto() {
  const [d, setD] = useState(30);
  const { data, error, loading, reload } = useApi<Data>(`/api/mobile/crypto-overview?d=${d}`);
  const g = data?.global;
  return (
    <Screen title="Visão de mercado" subtitle="Termômetro geral do mercado cripto: valor total, volume, dominância do Bitcoin e humor dos investidores.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {SECOES.map((s) => {
          const on = s.label === "Visão de mercado";
          const ok = on || !!s.to;
          return (
            <Pressable key={s.label} disabled={!ok || on} onPress={() => s.to && router.push(s.to)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: on ? C.gold : "transparent", marginBottom: -1, opacity: ok ? 1 : 0.5, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: on ? C.goldSoft : C.muted, fontWeight: "600" }}>{s.label}</Text>
              {s.pro && <ProBadge />}
              {!ok && <Text style={{ color: C.muted, fontSize: 10 }}>em breve</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      <Status loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          {g && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                ["Valor de mercado total", g.totalCapUsd === null ? "—" : usdCompact(g.totalCapUsd), g.capChange24h],
                ["Volume em 24h", g.totalVolumeUsd === null ? "—" : usdCompact(g.totalVolumeUsd), undefined],
                ["Dominância do Bitcoin", g.btcDominance === null ? "—" : `${br1(g.btcDominance)}%`, undefined],
                ["Criptomoedas ativas", g.activeCoins === null ? "—" : g.activeCoins.toLocaleString("pt-BR"), undefined],
              ].map(([l, v, ch]) => (
                <Card key={l as string} style={{ width: "48.5%", padding: 12 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{l as string}</Text>
                  <Text style={{ color: C.white, fontSize: 18, fontWeight: "700" }}>{v as string}</Text>
                  {typeof ch === "number" && <Text style={{ color: ch >= 0 ? C.up : C.down, fontWeight: "600", fontSize: 12 }}>{pct(ch)}</Text>}
                </Card>
              ))}
            </View>
          )}

          <Card>
            <H2>Medo e Ganância</H2>
            {data.fng ? (
              <>
                <Text style={{ color: fngColor(data.fng.value), fontSize: 40, fontWeight: "700" }}>{data.fng.value}</Text>
                <Text style={{ color: C.white, fontWeight: "600" }}>{data.fng.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Últimos 30 dias (0 = medo extremo, 100 = ganância extrema; mais antigo à esquerda)</Text>
                <Bars values={data.fng.history} color={fngColor} height={80} />
              </>
            ) : <Muted>Indisponível no momento.</Muted>}
            <Muted>Fonte: alternative.me</Muted>
          </Card>

          <Card>
            <H2>Índice de altcoins (30 dias)</H2>
            {data.altIndex !== null ? (
              <>
                <Text style={{ color: C.white, fontSize: 32, fontWeight: "700" }}>{data.altIndex}<Text style={{ color: C.muted, fontSize: 16, fontWeight: "400" }}> /100</Text></Text>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: C.panel2, overflow: "hidden" }}><View style={{ width: `${data.altIndex}%`, height: 8, backgroundColor: data.altIndex >= 75 ? "#4f46e5" : C.gold }} /></View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: C.muted, fontSize: 11 }}>Temporada do Bitcoin</Text><Text style={{ color: C.muted, fontSize: 11 }}>Temporada de altcoins</Text></View>
                <Muted>Porcentagem das 100 maiores altcoins (sem stablecoins) que rendeu mais que o Bitcoin em 30 dias. Acima de 75 indica temporada de altcoins.</Muted>
              </>
            ) : <Muted>Indisponível no momento.</Muted>}
          </Card>

          <Card>
            <H2>Dominância</H2>
            {g && g.btcDominance !== null && g.ethDominance !== null && data.others !== null ? (
              <>
                <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }}>
                  <View style={{ flex: g.btcDominance, backgroundColor: "#f7931a" }} /><View style={{ flex: g.ethDominance, backgroundColor: "#627eea" }} /><View style={{ flex: data.others, backgroundColor: "#6b7280" }} />
                </View>
                <Text style={{ color: C.white }}>Bitcoin <Text style={{ fontWeight: "700" }}>{br1(g.btcDominance)}%</Text> · Ethereum <Text style={{ fontWeight: "700" }}>{br1(g.ethDominance)}%</Text> · Outras <Text style={{ fontWeight: "700" }}>{br1(data.others)}%</Text></Text>
              </>
            ) : <Muted>Indisponível no momento.</Muted>}
          </Card>

          <Card>
            <H2>Valor de mercado do Bitcoin</H2>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {PERIODS.map((p) => {
                const locked = !data.pro && p.d !== 30;
                const on = p.d === data.days;
                return (
                  <Pressable key={p.d} disabled={locked} onPress={() => setD(p.d)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: on ? C.gold : C.panel2, borderWidth: 1, borderColor: on ? C.gold : C.line, opacity: locked ? 0.45 : 1 }}>
                    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{p.l}</Text>
                  </Pressable>
                );
              })}
            </View>
            {data.cap.length > 1 && <Bars values={data.cap} height={140} />}
            {!data.pro && <Muted>Períodos maiores no plano Premium.</Muted>}
            <Muted>O Bitcoin representa cerca de 60% do mercado e costuma ditar o rumo das demais criptomoedas.</Muted>
          </Card>

          <Text style={{ color: C.goldSoft, fontSize: 20, fontWeight: "700" }}>Maiores altas e baixas em 24h</Text>
          {data.gainers && data.losers ? (
            <>
              <Movers title="Maiores altas" list={data.gainers} tone={C.up} />
              <Movers title="Maiores baixas" list={data.losers} tone={C.down} />
              <Muted>Altas e baixas consideram as 250 maiores criptomoedas com volume acima de US$ 1 milhão em 24h.</Muted>
            </>
          ) : (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ProBadge /><H2>Maiores altas e baixas do dia (exclusivo do plano Premium)</H2></View>
              <GoldButton label="Ver planos" onPress={() => router.push("/planos")} />
            </Card>
          )}
          <Muted>Conteúdo educativo e informativo, baseado em dados públicos. Não é recomendação de investimento.</Muted>
        </>
      )}
    </Screen>
  );
}
