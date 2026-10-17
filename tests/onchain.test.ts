import { test } from "node:test";
import assert from "node:assert/strict";
import { INDICATORS, INDICATOR_BY_ID, MAX_INDICATORS, epochDay, formatValue, parseIds } from "../src/lib/onchain-defs";
import {
  alignSeries, buildBase, computeIndicators, expandingStd, hashToEh, issuance, parseHolderRows, powerLaw, sma, unavailableIds,
  type RawOnchain, type Series,
} from "../src/lib/onchain-calc";
import { dateTicks, extent, linePath, linearTicks, logTicks, padExtent, sampleIndices } from "../src/lib/chartmath";

const N = 800;
const START = epochDay("2020-01-01");

/** Oferta cresce 450 moedas por dia, preço sobe de 100 a 899 e valor realizado = metade do valor de mercado. */
function synth(over: Partial<RawOnchain["series"]> = {}): RawOnchain {
  const price: Series = Array.from({ length: N }, (_, i) => 100 + i);
  const supply: Series = Array.from({ length: N }, (_, i) => 18_000_000 + 450 * i);
  const rc: Series = price.map((p, i) => ((p as number) * (supply[i] as number)) / 2);
  return {
    start: START, n: N, missing: [], failed: [],
    series: {
      PriceUSD: price, SplyCur: supply, CapRealUSD: rc,
      HashRate: Array.from({ length: N }, () => 5e8), // TH/s
      DiffMean: Array.from({ length: N }, () => 9e13),
      AdrActCnt: Array.from({ length: N }, () => 900_000),
      TxCnt: Array.from({ length: N }, () => 300_000),
      TxTfrValAdjUSD: Array.from({ length: N }, () => 1e10),
      ...over,
    },
  };
}

const last = (a: Series) => a[a.length - 1] as number;

test("sma exige janela completa e ignora o começo", () => {
  const out = sma([1, 2, 3, 4, 5], 3);
  assert.deepEqual(out, [null, null, 2, 3, 4]);
  assert.deepEqual(sma([1, null, 3, 4, 5], 3), [null, null, null, null, 4]);
});

test("expandingStd bate com o desvio padrão da população", () => {
  const out = expandingStd([2, 4, 4, 4, 5, 5, 7, 9], 8);
  assert.equal(out.slice(0, 7).every((v) => v === null), true);
  assert.ok(Math.abs((out[7] as number) - 2) < 1e-9);
});

test("issuance é a diferença da oferta", () => {
  assert.deepEqual(issuance([10, 15, 15, 21]), [null, 5, 0, 6]);
});

test("lei de potência: valor na data conhecida e crescimento", () => {
  const p = powerLaw(epochDay("2024-01-01")) as number;
  assert.ok(p > 60_000 && p < 90_000, `valor inesperado: ${p}`);
  assert.ok((powerLaw(epochDay("2026-01-01")) as number) > p);
  assert.equal(powerLaw(epochDay("2009-01-01")), null);
});

test("hash rate: aceita H/s ou TH/s e devolve EH/s", () => {
  assert.ok(Math.abs((hashToEh([6e8, 7e8])[1] as number) - 700) < 1e-9);
  assert.ok(Math.abs((hashToEh([6e20, 7e20])[1] as number) - 700) < 1e-9);
});

test("indicadores de valuation com dados sintéticos", () => {
  const b = buildBase(synth());
  const c = computeIndicators(b, ["mvrv", "nupl", "realized_price", "realized_cap", "puell", "drawdown"]);
  assert.ok(Math.abs(last(c.mvrv[0]) - 2) < 1e-9); // mercado = 2 × realizado
  assert.ok(Math.abs(last(c.nupl[0]) - 0.5) < 1e-9);
  assert.ok(Math.abs(last(c.realized_price[0]) - (last(b.price) / 2)) < 1e-6);
  assert.equal(c.realized_cap.length, 2);
  assert.equal(last(c.drawdown[0]), 0); // preço só sobe
  // emissão constante em moedas e preço crescendo: Puell perto de 1, um pouco acima
  const puell = last(c.puell[0]);
  assert.ok(puell > 1 && puell < 1.5, `puell ${puell}`);
});

test("queda desde a máxima fica negativa depois do topo", () => {
  const raw = synth();
  raw.series.PriceUSD = raw.series.PriceUSD.map((p, i) => (i < 400 ? p : 200));
  const c = computeIndicators(buildBase(raw), ["drawdown"]);
  assert.ok(last(c.drawdown[0]) < -50 && last(c.drawdown[0]) > -80);
});

test("MVRV Z-Score só aparece depois de 365 dias e é positivo com valor realizado menor", () => {
  const z = computeIndicators(buildBase(synth()), ["mvrv_z"]).mvrv_z[0];
  assert.equal(z[300], null);
  assert.ok((z[N - 1] as number) > 0);
});

test("médias e Pi Cycle", () => {
  const c = computeIndicators(buildBase(synth()), ["dma200", "wma200", "pi_cycle", "mayer"]);
  assert.equal(c.dma200[0][198], null);
  assert.notEqual(c.dma200[0][199], null);
  assert.equal(c.wma200[0].every((v) => v === null), true); // 800 dias < 1400
  assert.equal(c.pi_cycle.length, 2);
  assert.ok(Math.abs(last(c.pi_cycle[1]) - 2 * (last(sma(synth().series.PriceUSD, 350)))) < 1e-6);
  assert.ok(last(c.mayer[0]) > 1);
});

test("derivar valor realizado do MVRV quando falta CapRealUSD", () => {
  const raw = synth();
  delete raw.series.CapRealUSD;
  raw.series.CapMVRVCur = Array.from({ length: N }, () => 2);
  const b = buildBase(raw);
  assert.ok(b.rc);
  assert.ok(Math.abs(last(computeIndicators(b, ["mvrv"]).mvrv[0]) - 2) < 1e-9);
});

test("sem métricas opcionais, só os indicadores dependentes ficam indisponíveis", () => {
  const raw = synth();
  delete raw.series.HashRate;
  delete raw.series.CapRealUSD;
  const b = buildBase(raw);
  const off = unavailableIds(b);
  for (const id of ["hashrate", "hash_ribbons", "mvrv", "mvrv_z", "nupl", "realized_price", "realized_cap"]) assert.ok(off.includes(id), id);
  for (const id of ["puell", "wma200", "power_law", "difficulty"]) assert.ok(!off.includes(id), id);
  assert.deepEqual(Object.keys(computeIndicators(b, ["mvrv", "puell"])), ["puell"]);
});

test("todo indicador devolve uma série por linha definida, com o tamanho dos dados", () => {
  const pairs = Array.from({ length: 400 }, (_, i): [number, number] => [START + 400 + i, 80 + i]);
  const b = buildBase(synth(), { sth: pairs, lth: pairs });
  const all = computeIndicators(b, INDICATORS.map((d) => d.id));
  assert.equal(Object.keys(all).length, INDICATORS.length);
  for (const d of INDICATORS) {
    assert.equal(all[d.id].length, d.lines.length, d.id);
    for (const s of all[d.id]) assert.equal(s.length, N, d.id);
  }
});

test("parseIds limita a 3, tira repetidos e ids inválidos", () => {
  assert.deepEqual(parseIds("mvrv,mvrv,xxx,puell,nupl,pi_cycle"), ["mvrv", "puell", "nupl"]);
  assert.equal(parseIds("mvrv,puell,nupl,pi_cycle").length, MAX_INDICATORS);
  assert.deepEqual(parseIds(null), []);
  assert.deepEqual(parseIds("__proto__,constructor"), []);
});

test("definições: ids únicos, textos e eixos coerentes", () => {
  assert.equal(new Set(INDICATORS.map((d) => d.id)).size, INDICATORS.length);
  for (const d of INDICATORS) {
    assert.ok(d.lines.length >= 1 && d.desc.length > 40, d.id);
    assert.equal(INDICATOR_BY_ID[d.id], d);
  }
});

test("alignSeries posiciona por dia", () => {
  assert.deepEqual(alignSeries(new Map([[10, 1], [12, 3], [99, 9]]), 10, 4), [1, null, 3, null]);
});

test("formatação de valores", () => {
  assert.equal(formatValue("usd", 95_000, true), "$95 mil");
  assert.equal(formatValue("usd", 0.5, true), "$0,50");
  assert.equal(formatValue("pct", -45.3), "-45,3%");
  assert.equal(formatValue("ratio", 1.8567), "1,86");
  assert.equal(formatValue("eh", 612.4), "612 EH/s");
});

test("escalas do gráfico", () => {
  assert.deepEqual(extent([[1, null, 5], [0, 10, 2]], 0, 2, true), [1, 10]);
  assert.deepEqual(extent([[1, null, 5]], 0, 2, false), [1, 5]);
  assert.equal(extent([[null]], 0, 0, false), null);
  const [lo, hi] = padExtent([1, 100], true);
  assert.ok(lo < 1 && hi > 100);
  assert.deepEqual(linearTicks(0, 10, 5), [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(logTicks(1, 100_000), [1, 10, 100, 1000, 10000, 100000]);
  assert.ok(logTicks(30, 300).includes(50));
});

test("marcas de data e amostragem", () => {
  const ticks = dateTicks(epochDay("2012-01-01"), epochDay("2026-10-01"), 8);
  assert.ok(ticks.length > 0 && ticks.length <= 8);
  assert.match(ticks[0].label, /^\d{4}$/);
  const v: Series = Array.from({ length: 1000 }, (_, i) => (i === 500 ? 1000 : i % 10));
  const idx = sampleIndices(v, 0, 999, 100);
  assert.ok(idx.length < 500 && idx.includes(500), "mantém o pico");
  assert.deepEqual(sampleIndices([1, 2, 3], 0, 2, 100), [0, 1, 2]);
});

test("linePath interrompe a linha nos buracos", () => {
  const d = linePath([0, 1, 2, 9, 10], (i) => i, (v) => v, [1, 2, 3, null, null, null, null, null, null, 4, 5], 3);
  assert.equal(d, "M0.0,1.0L1.0,2.0L2.0,3.0M9.0,4.0L10.0,5.0");
});

test("parseHolderRows aceita data em texto ou timestamp e qualquer nome de campo numérico", () => {
  const a = parseHolderRows([
    { d: "2024-01-02", unixTs: 1704153600, sthRealizedPrice: "42000.5" },
    { d: "2024-01-01", unixTs: 1704067200, sthRealizedPrice: 41000 },
    { d: "2024-01-03", sthRealizedPrice: null },
    { unixTs: 1704326400000, valor: 43000 },
    "lixo",
  ]);
  assert.deepEqual(a.map((x) => x[1]), [41000, 42000.5, 43000]);
  assert.equal(a[0][0], epochDay("2024-01-01"));
  assert.deepEqual(parseHolderRows({ data: [{ d: "2024-01-01", x: 5 }] }), [[epochDay("2024-01-01"), 5]]);
  assert.deepEqual(parseHolderRows({ erro: "limite" }), []);
  assert.deepEqual(parseHolderRows(null), []);
});

test("preço realizado STH/LTH: MVRV STH = preço ÷ preço realizado e indisponível sem a fonte", () => {
  const raw = synth();
  const sthPairs: [number, number][] = Array.from({ length: N }, (_, i) => [START + i, 50 + i]);
  const b = buildBase(raw, { sth: sthPairs, lth: null });
  const c = computeIndicators(b, ["sth_mvrv", "sth_realized_price", "lth_realized_price", "lth_mvrv"]);
  assert.ok(Math.abs(last(c.sth_mvrv[0]) - (100 + N - 1) / (50 + N - 1)) < 1e-9);
  assert.equal(last(c.sth_realized_price[0]), 50 + N - 1);
  assert.equal(c.lth_realized_price, undefined);
  const off = unavailableIds(b);
  assert.ok(off.includes("lth_mvrv") && off.includes("lth_realized_price") && !off.includes("sth_mvrv"));
  assert.ok(unavailableIds(buildBase(raw)).includes("sth_realized_price"));
});
