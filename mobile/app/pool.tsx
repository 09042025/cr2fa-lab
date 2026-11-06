import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { RangeChart } from "../src/RangeChart";
import { earnings, impermanentLoss, presetRange, split } from "../src/clsim";
import { rate, usdCompact } from "../src/format";
import { C } from "../src/theme";
import { useApi } from "../src/useApi";
import { Card, GoldButton, H2, Muted, ProGate, Screen, Status } from "../src/ui";

interface D {
  id: string; symbol: string; project: string; chain: string; poolMeta: string | null; stablecoin: boolean; rwa: boolean;
  tvlUsd: number; volumeUsd1d: number | null; apy: number | null; apyBase: number | null; apyReward: number | null; apyMean30d: number | null;
  feeRate: number | null; feeFromDex: boolean; fees24h: number | null; baseApr: number | null; poolValueUsd: number; poolValueFromChain: boolean;
  price: number | null; usdA: number | null; usdB: number | null; priceNote: string | null; link: { url: string; kind: string; name: string };
  dist?: { center: number; lo: number; hi: number; bins: number[] } | null;
  chart: { embed: string; page: string } | null; history: { t: number; apy: number | null; tvl: number | null }[];
}
// O gráfico incorporado usa react-native-webview. Se ainda não estiver instalado, mostramos um botão que abre o DexScreener.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebViewC: any = null;
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }
const num = (s: string) => { const v = Number(s.replace(",", ".")); return Number.isFinite(v) ? v : NaN; };
const fmt = (v: number, d = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const usd = (v: number) => `US$ ${fmt(v)}`;
const plain = (v: number) => String(+v.toPrecision(7)).replace(".", ",");
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 6 });
const input = { backgroundColor: C.ink, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.white, paddingHorizontal: 12, paddingVertical: 9 } as const;
const Stat = ({ l, v, tone }: { l: string; v: string; tone?: string }) => <Card style={{ width: "48.5%", padding: 12 }}><Text style={{ color: C.muted, fontSize: 12 }}>{l}</Text><Text style={{ color: tone ?? C.white, fontSize: 17, fontWeight: "700" }}>{v}</Text></Card>;
const Chip = ({ label, on, onPress, off }: { label: string; on: boolean; onPress: () => void; off?: boolean }) => (
  <Pressable disabled={off} onPress={onPress} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2, opacity: off ? 0.5 : 1 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700" }}>{label}</Text>
  </Pressable>
);

function Charts({ d }: { d: D }) {
  const [tab, setTab] = useState<"price" | "apr" | "tvl">(d.chart ? "price" : "apr");
  const apr = d.history.filter((h) => h.apy !== null).map((h) => h.apy!);
  const tvl = d.history.filter((h) => h.tvl !== null).map((h) => h.tvl!);
  const series = tab === "apr" ? apr : tvl;
  const min = Math.min(...series), max = Math.max(...series);
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Preço" on={tab === "price"} off={!d.chart} onPress={() => setTab("price")} />
        <Chip label="APR" on={tab === "apr"} onPress={() => setTab("apr")} />
        <Chip label="TVL" on={tab === "tvl"} onPress={() => setTab("tvl")} />
      </View>
      {tab === "price" && d.chart && (
        WebViewC ? (
          <View style={{ height: 380, borderRadius: 10, overflow: "hidden" }}>
            <WebViewC source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0b1020}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${d.chart.embed}" allow="clipboard-write"></iframe></body></html>`, baseUrl: "https://nizainvest.com.br" }} originWhitelist={["*"]} setSupportMultipleWindows={false} startInLoadingState style={{ flex: 1, backgroundColor: C.ink }} javaScriptEnabled domStorageEnabled nestedScrollEnabled />
          </View>
        ) : <GoldButton label="Abrir gráfico no DexScreener ↗" onPress={() => Linking.openURL(d.chart!.page)} />
      )}
      {tab !== "price" && (series.length > 1 ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: C.muted, fontSize: 12 }}>Máx. {tab === "apr" ? `${fmt(max, 1)}%` : usdCompact(max)}</Text><Text style={{ color: C.muted, fontSize: 12 }}>Mín. {tab === "apr" ? `${fmt(min, 1)}%` : usdCompact(min)}</Text></View>
          <View style={{ height: 130, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
            {series.map((v, i) => <View key={i} style={{ flex: 1, height: `${Math.max(4, ((v - min) / (max - min || 1)) * 100)}%`, backgroundColor: C.gold, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />)}
          </View>
          <Muted>{tab === "apr" ? "APR total diário do pool." : "TVL diário do pool."} Fonte: DefiLlama.</Muted>
        </>
      ) : <Muted>Histórico indisponível para este pool.</Muted>)}
      {tab === "price" && d.chart && <Muted>Gráfico do DexScreener.</Muted>}
    </Card>
  );
}

function Sim({ d }: { d: D }) {
  const [symA, symB] = d.symbol.split(/[-/ +]/).filter(Boolean).concat(["A", "B"]);
  const [manual, setManual] = useState("");
  const p = d.price ?? num(manual);
  const [kind, setKind] = useState<"narrow" | "wide" | "full" | "custom">("wide");
  const [minS, setMinS] = useState(""); const [maxS, setMaxS] = useState("");
  const [valueS, setValueS] = useState("1000");
  const [showIl, setShowIl] = useState(false);
  const [pa, pb] = useMemo<[number, number]>(() => {
    if (!(p > 0)) return [0, Infinity];
    if (kind === "custom") { const a = num(minS), b = num(maxS); return [Number.isFinite(a) && a >= 0 ? a : 0, Number.isFinite(b) && b > 0 ? b : Infinity]; }
    return presetRange(p, kind, d.stablecoin);
  }, [p, kind, minS, maxS, d.stablecoin]);
  const value = num(valueS);
  const ok = p > 0 && pb > pa && value > 0;
  const e = ok ? earnings(value, p, pa, pb, d.fees24h, d.poolValueUsd) : null;
  const sp = ok ? split(p, pa, pb) : null;
  const pick = (k: "narrow" | "wide" | "full") => { setKind(k); if (p > 0) { const [a, b] = presetRange(p, k, d.stablecoin); setMinS(k === "full" ? "0" : sig(a)); setMaxS(k === "full" ? "" : sig(b)); } };
  const shownMin = kind === "custom" ? plain(num(minS) || 0) : pa > 0 ? plain(pa) : "0";
  const shownMax = kind === "custom" ? (maxS === "" ? "" : plain(num(maxS))) : Number.isFinite(pb) ? plain(pb) : "";
  return (
    <Card style={{ gap: 10 }}>
      <H2>Simulação de taxas</H2>
      <Muted>Escolha a faixa de preço e o valor. Faixa mais estreita rende mais taxas enquanto o preço fica dentro dela, mas sai de campo com mais facilidade.</Muted>
      {d.price === null && (
        <View style={{ gap: 4 }}>
          {d.priceNote && <Text style={{ color: C.goldSoft, fontSize: 12 }}>{d.priceNote}</Text>}
          <Text style={{ color: C.muted, fontSize: 12 }}>Preço atual ({symB} por {symA})</Text>
          <TextInput value={manual} onChangeText={setManual} keyboardType="decimal-pad" placeholder="ex.: 182,82" placeholderTextColor={C.muted} style={input} />
        </View>
      )}
      {p > 0 && <Text style={{ color: C.white }}>Preço atual: <Text style={{ fontWeight: "700" }}>{sig(p)}</Text> <Text style={{ color: C.muted }}>{symB} por {symA}</Text></Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip label="Estreita" on={kind === "narrow"} off={!(p > 0)} onPress={() => pick("narrow")} />
        <Chip label="Larga" on={kind === "wide"} off={!(p > 0)} onPress={() => pick("wide")} />
        <Chip label="Total" on={kind === "full"} off={!(p > 0)} onPress={() => pick("full")} />
        <Chip label="Redefinir" on={false} off={!(p > 0)} onPress={() => pick("wide")} />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Preço mínimo{p > 0 ? ` (${pa > 0 ? fmt((pa / p - 1) * 100, 1) : "-100"}%)` : ""}</Text><TextInput value={shownMin} onChangeText={(t) => { if (kind !== "custom") setMaxS(Number.isFinite(pb) ? String(pb) : ""); setKind("custom"); setMinS(t); }} keyboardType="decimal-pad" style={input} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Preço máximo{p > 0 && Number.isFinite(pb) ? ` (+${fmt((pb / p - 1) * 100, 1)}%)` : ""}</Text><TextInput value={shownMax} onChangeText={(t) => { if (kind !== "custom") setMinS(pa > 0 ? String(pa) : "0"); setKind("custom"); setMaxS(t); }} keyboardType="decimal-pad" placeholder="∞" placeholderTextColor={C.muted} style={input} /></View>
      </View>
      {p > 0 && (
        <RangeChart price={p} min={pa} max={pb} bins={d.dist ? { lo: d.dist.lo * (p / d.dist.center), hi: d.dist.hi * (p / d.dist.center), values: d.dist.bins } : null}
          onChange={(a, b) => { setKind("custom"); setMinS(String(a)); setMaxS(Number.isFinite(b) ? String(b) : ""); }} fmtPct={(v) => (v <= 0 ? "-100%" : `${v / p - 1 >= 0 ? "+" : ""}${fmt((v / p - 1) * 100, 1)}%`)} />
      )}
      <View><Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Valor a colocar (US$)</Text><TextInput value={valueS} onChangeText={setValueS} keyboardType="decimal-pad" style={input} /></View>
      {e && sp && (
        <>
          {!e.inRange && <Text style={{ color: C.goldSoft, fontSize: 12 }}>O preço atual está fora da faixa: nesta faixa não há ganho de taxas.</Text>}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([[symA, sp.fracA, d.usdA], [symB, sp.fracB, d.usdB]] as const).map(([s, f, u]) => (
              <View key={s} style={{ flex: 1, borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>{s}</Text>
                <Text style={{ color: C.white, fontWeight: "700" }}>{usd(value * f)}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{fmt(f * 100, 1)}%{u ? ` · ${sig((value * f) / u)} ${s}` : ""}</Text>
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: "rgba(212,175,55,0.1)", borderColor: C.gold, borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 }}>
            <Text style={{ color: C.goldSoft, fontSize: 12 }}>Ganho estimado em taxas</Text>
            {e.year === null ? <Muted>Sem dados de volume para estimar este pool.</Muted> : (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View><Text style={{ color: C.muted, fontSize: 11 }}>24 horas</Text><Text style={{ color: C.white, fontWeight: "700" }}>{usd(e.day!)}</Text></View>
                <View><Text style={{ color: C.muted, fontSize: 11 }}>Mensal</Text><Text style={{ color: C.white, fontWeight: "700" }}>{usd(e.month!)}</Text></View>
                <View><Text style={{ color: C.muted, fontSize: 11 }}>Anual · APR {fmt(e.apr!, 1)}%</Text><Text style={{ color: C.white, fontWeight: "700" }}>{usd(e.year!)}</Text></View>
              </View>
            )}
          </View>
          <Pressable onPress={() => setShowIl(!showIl)}><Text style={{ color: C.goldSoft, fontWeight: "700" }}>{showIl ? "Ocultar" : "Ver"} simulação de perda impermanente</Text></Pressable>
          {showIl && [-0.5, -0.2, -0.1, 0.1, 0.2, 0.5, 1].map((c) => {
            const il = impermanentLoss(p, pa, pb, c);
            return <View key={c} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: C.muted }}>{symA} {c > 0 ? "+" : ""}{c * 100}%</Text><Text style={{ color: C.white }}>{il === null ? "—" : `${fmt(il, 2)}%`}</Text></View>;
          })}
        </>
      )}
      {!ok && p > 0 && <Muted>Informe uma faixa válida (máximo maior que o mínimo) e um valor maior que zero.</Muted>}
      <GoldButton label={`Abrir na ${d.link.kind === "llama" ? "DefiLlama" : d.link.name} ↗`} onPress={() => Linking.openURL(d.link.url)} />
      <Muted>{d.poolValueFromChain ? "Estimativa baseada nas taxas de 24h e na liquidez ativa do pool hoje (lida da blockchain);" : "Estimativa aproximada: sem a liquidez ativa do pool, usamos o TVL, o que costuma superestimar o ganho em pools concentrados;"} o ganho real muda todo dia e a perda impermanente pode superar as taxas. Confira o endereço do site e os tokens antes de conectar a carteira.</Muted>
    </Card>
  );
}

function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: d, error, loading, reload } = useApi<D>(`/api/mobile/defi/pool?id=${encodeURIComponent(String(id ?? ""))}`);
  return (
    <>
      <Status loading={loading && !d} error={error} onRetry={reload} />
      {d && (
        <>
          <Text style={{ color: C.muted }}>{d.project} · {d.chain}{d.stablecoin ? " · stable" : ""}{d.rwa ? " · RWA" : ""}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Stat l="TVL" v={usdCompact(d.tvlUsd)} />
            <Stat l="Volume (24h)" v={d.volumeUsd1d === null ? "—" : usdCompact(d.volumeUsd1d)} />
            <Stat l="Taxas geradas (24h)" v={d.fees24h === null ? "—" : usdCompact(d.fees24h)} tone={C.up} />
            <Stat l="APR total" v={rate(d.apy)} tone={C.goldSoft} />
            <Stat l="APR de taxas" v={rate(d.apyBase)} />
            <Stat l="Recompensas" v={d.apyReward === null && d.apyBase !== null ? "0,00%" : rate(d.apyReward)} />
            <Stat l="Média 30 dias" v={rate(d.apyMean30d)} />
            <Stat l="Taxa do pool" v={d.feeRate === null ? "—" : `${(d.feeRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}%${d.feeFromDex ? "" : " (est.)"}`} />
          </View>
          <Muted>APR, TVL e volume vêm do DefiLlama (média do período) e podem diferir um pouco dos números que a própria DEX mostra, que usa só as taxas das últimas 24h. Recompensas em 0,00% = o pool não paga incentivos extras em token, só as taxas de negociação.</Muted>
          <Charts d={d} />
          <Sim d={d} />
        </>
      )}
    </>
  );
}

export default function Pool() {
  return <Screen title="Detalhes do pool"><ProGate feature="Detalhes e simulador de pools (exclusivo do plano Premium)"><Detail /></ProGate></Screen>;
}
