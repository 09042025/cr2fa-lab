import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { rate, usd, usdCompact } from "./format";
import { C } from "./theme";
import { useApi } from "./useApi";
import { Card, GoldButton, H2, Muted, Status } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebViewC: any = null;
try { WebViewC = require("react-native-webview").WebView; } catch { WebViewC = null; }

interface D {
  position: {
    pair: string; symbol0: string; symbol1: string; fee: number; chain: string; tokenId: string; price: number; priceLower: number; priceUpper: number;
    health: "ok" | "attention" | "out"; pos: number; amount0: number; amount1: number; valueUsd: number | null; fees0: number; fees1: number; feesUsd: number | null;
    poolTvlUsd: number | null; poolApr: number | null; estDayUsd: number | null; estApr: number | null; link: string;
  };
  perf: null | { openedAt: number; ageDays: number; invested0: number; invested1: number; investedUsd: number; collected0: number; collected1: number; collectedUsd: number; uncollectedUsd: number; totalFeesUsd: number; avgDailyFeesUsd: number; pnlUsd: number; roi: number; apr: number; feeApr: number; divergenceUsd: number };
  series: { t: number; value: number; hold: number }[];
  dist: null | { center: number; lo: number; hi: number; bins: number[] };
  history: { t: number; apy: number | null; tvl: number | null }[];
  chart: { embed: string; page: string } | null; eventsOk: boolean; eventsError?: string | null;
}
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 5 });
const tok = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const sg = (v: number) => `${v >= 0 ? "+" : "−"}${usd(Math.abs(v))}`;
const col = (v: number) => (v >= 0 ? C.up : C.down);
const HEALTH = { ok: ["Dentro da faixa", C.up], attention: ["Atenção: perto da borda", C.gold], out: ["Fora da faixa", C.down] } as const;
const Row = ({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line }}>
    <Text style={{ color: C.muted, flex: 1 }}>{k}</Text>
    <View style={{ alignItems: "flex-end", flex: 1.4 }}><Text style={{ color: color ?? C.white, fontWeight: "700" }}>{v}</Text>{sub ? <Text style={{ color: C.muted, fontSize: 11 }}>{sub}</Text> : null}</View>
  </View>
);
const Chip = ({ label, on, onPress, off }: { label: string; on: boolean; onPress: () => void; off?: boolean }) => (
  <Pressable disabled={off} onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: on ? C.gold : C.line, backgroundColor: on ? C.gold : C.panel2, opacity: off ? 0.5 : 1 }}>
    <Text style={{ color: on ? C.ink : C.white, fontWeight: "700", fontSize: 13 }}>{label}</Text>
  </Pressable>
);

function Bars({ title, values, hold, fm, note }: { title: string; values: number[]; hold?: number[]; fm: (v: number) => string; note: string }) {
  const all = hold ? [...values, ...hold] : values;
  const min = Math.min(...all), max = Math.max(...all);
  const h = (v: number) => `${Math.max(3, ((v - min) / (max - min || 1)) * 100)}%` as `${number}%`;
  return (
    <Card style={{ gap: 8 }}>
      <H2>{title}</H2>
      {values.length > 1 ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: C.muted, fontSize: 12 }}>Máx. {fm(max)}</Text><Text style={{ color: C.muted, fontSize: 12 }}>Mín. {fm(min)}</Text></View>
          <View style={{ height: 130, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
            {values.map((v, i) => (
              <View key={i} style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
                <View style={{ height: h(v), backgroundColor: C.gold, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                {hold && hold[i] !== undefined && <View style={{ position: "absolute", bottom: h(hold[i]), left: 0, right: 0, height: 2, backgroundColor: C.white }} />}
              </View>
            ))}
          </View>
          <Muted>{note}</Muted>
        </>
      ) : <Muted>Histórico indisponível.</Muted>}
    </Card>
  );
}

function Charts({ d }: { d: D }) {
  const apr = d.history.filter((h) => h.apy !== null).map((h) => h.apy!);
  const tvl = d.history.filter((h) => h.tvl !== null).map((h) => h.tvl!);
  return (
    <>
      <Bars title="Valor da posição vs. segurar (HOLD)" values={d.series.map((x) => x.value)} hold={d.series.map((x) => x.hold)} fm={usd} note="Barras douradas = valor da posição (sem taxas). Traço branco = só segurar os tokens (HOLD). A diferença é a divergência." />
      {d.chart && (
        <Card style={{ gap: 8 }}>
          <H2>Preço do par</H2>
          {WebViewC
            ? <View style={{ height: 320, borderRadius: 10, overflow: "hidden" }}><WebViewC source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0b1020}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${d.chart.embed}" allow="clipboard-write"></iframe></body></html>`, baseUrl: "https://nizainvest.com.br" }} originWhitelist={["*"]} setSupportMultipleWindows={false} startInLoadingState style={{ flex: 1, backgroundColor: C.ink }} javaScriptEnabled domStorageEnabled nestedScrollEnabled /></View>
            : null}
          <GoldButton ghost label="Abrir gráfico no DexScreener ↗" onPress={() => Linking.openURL(d.chart!.page)} />
        </Card>
      )}
      <Bars title="APR do pool" values={apr} fm={(v) => `${v.toFixed(1)}%`} note="APR total diário do pool. Fonte: DefiLlama." />
      <Bars title="TVL do pool" values={tvl} fm={usdCompact} note="TVL diário do pool. Fonte: DefiLlama." />
    </>
  );
}

export function LpDetailBody({ address, rede, id }: { address: string; rede: string; id: string }) {
  const { data, error, loading, reload } = useApi<D>(`/api/mobile/lp/posicao?address=${address}&rede=${rede}&id=${id}`);
  return (
    <>
      {!data ? <Status loading={loading} error={error} onRetry={reload} /> : (() => {
          const p = data.position, f = data.perf, [hl, hc] = HEALTH[p.health];
          return (
            <>
              <Card style={{ gap: 4 }}>
                <Text style={{ color: hc, fontWeight: "800" }}>{hl}</Text>
                <Muted>{p.chain} · #{p.tokenId}</Muted>
                <Text style={{ color: C.white, fontSize: 24, fontWeight: "800" }}>{p.valueUsd === null ? "—" : usd(p.valueUsd)}</Text>
                {f && <Text style={{ color: col(f.pnlUsd), fontWeight: "700" }}>PnL {sg(f.pnlUsd)} · ROI {rate(f.roi * 100)} · APR {rate(f.apr * 100)}</Text>}
                <Text style={{ color: C.up }}>Taxas a coletar: {p.feesUsd === null ? "—" : usd(p.feesUsd)}</Text>
              </Card>
              {!data.eventsOk && <Muted>Não consegui ler o histórico de depósitos agora. PnL e gráfico de valor aparecem quando responder.{data.eventsError ? ` (detalhe técnico: ${data.eventsError})` : ""}</Muted>}
              <Charts d={data} />
              {data.dist && (() => {
                const dd = data.dist, llo = Math.log(dd.lo), lhi = Math.log(dd.hi);
                return (
                  <Card style={{ gap: 8 }}>
                    <H2>Distribuição de liquidez</H2>
                    <View style={{ height: 110, flexDirection: "row", alignItems: "flex-end", gap: 1 }}>
                      {dd.bins.map((v, k) => { const mid = Math.exp(llo + ((k + 0.5) / dd.bins.length) * (lhi - llo)); const inR = mid >= p.priceLower && mid <= p.priceUpper;
                        return <View key={k} style={{ flex: 1, height: `${Math.max(2, v * 100)}%`, backgroundColor: inR ? C.gold : C.line, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />; })}
                    </View>
                    <Muted>Dourado = faixa da sua posição ({sig(p.priceLower)} a {sig(p.priceUpper)}). Preço atual {sig(p.price)} {p.symbol1}/{p.symbol0}.</Muted>
                  </Card>
                );
              })()}
              {f && (
                <Card style={{ gap: 0 }}>
                  <H2>Desempenho (referência HOLD)</H2>
                  <Row k="PnL do pool" v={sg(f.pnlUsd)} color={col(f.pnlUsd)} />
                  <Row k="ROI" v={rate(f.roi * 100)} color={col(f.roi)} />
                  <Row k="APR médio" v={rate(f.apr * 100)} color={col(f.apr)} />
                  <Row k="APR só de taxas" v={rate(f.feeApr * 100)} />
                  <Row k="Perda de divergência" v={sg(f.divergenceUsd)} color={col(f.divergenceUsd)} />
                </Card>
              )}
              {f && (
                <Card style={{ gap: 0 }}>
                  <H2>Taxas</H2>
                  <Row k="Total de taxas" v={usd(f.totalFeesUsd)} />
                  <Row k="A coletar" v={usd(f.uncollectedUsd)} sub={`${tok(p.fees0)} ${p.symbol0} + ${tok(p.fees1)} ${p.symbol1}`} color={C.up} />
                  <Row k="Já coletadas" v={usd(f.collectedUsd)} sub={`${tok(f.collected0)} ${p.symbol0} + ${tok(f.collected1)} ${p.symbol1}`} />
                  <Row k="Média por dia" v={usd(f.avgDailyFeesUsd)} />
                </Card>
              )}
              <Card style={{ gap: 0 }}>
                <H2>Ativos e pool</H2>
                <Row k="Ativos atuais" v={p.valueUsd === null ? "—" : usd(p.valueUsd)} sub={`${tok(p.amount0)} ${p.symbol0} + ${tok(p.amount1)} ${p.symbol1}`} />
                {f && <Row k="Ativos investidos" v={usd(f.investedUsd)} sub={`${tok(f.invested0)} ${p.symbol0} + ${tok(f.invested1)} ${p.symbol1}`} />}
                {f && <Row k="Idade" v={`${f.ageDays.toFixed(1).replace(".", ",")} dias`} sub={`aberta em ${new Date(f.openedAt * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`} />}
                <Row k="Liquidez do pool" v={p.poolTvlUsd === null ? "—" : usdCompact(p.poolTvlUsd)} />
                <Row k="APR do pool" v={p.poolApr === null ? "—" : rate(p.poolApr)} />
                <Row k="Ganho estimado/dia" v={p.estDayUsd === null ? "—" : usd(p.estDayUsd)} sub={p.estApr === null ? undefined : `APR estimado ${rate(p.estApr)}`} />
              </Card>
              <Pressable onPress={() => Linking.openURL(p.link)}><Text style={{ color: C.gold, fontWeight: "700" }}>Ver na Uniswap (só visualização) ↗</Text></Pressable>
            </>
          );
        })()}
    </>
  );
}
