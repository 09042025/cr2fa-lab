import test from "node:test";
import assert from "node:assert/strict";
import { feeGrowthInside, healthOf, positionAmounts, tickToPrice, uncollected } from "../src/lib/lppositions";

test("quantidades da posição: dentro, abaixo e acima da faixa", () => {
  const L = 1e18, sq = (t: number) => Math.pow(1.0001, t / 2);
  const [in0, in1] = positionAmounts(L, sq(0), -1000, 1000, 18, 18);
  assert.ok(in0 > 0 && in1 > 0 && Math.abs(in0 - in1) / in0 < 1e-6); // simétrico em torno do preço 1
  const [lo0, lo1] = positionAmounts(L, sq(-2000), -1000, 1000, 18, 18); // preço abaixo da faixa: só token0
  assert.ok(lo0 > 0 && lo1 === 0);
  const [hi0, hi1] = positionAmounts(L, sq(2000), -1000, 1000, 18, 18); // acima: só token1
  assert.ok(hi0 === 0 && hi1 > 0);
  // continuidade na borda inferior: tudo em token0
  const [b0, b1] = positionAmounts(L, sq(-1000), -1000, 1000, 18, 18);
  assert.ok(b1 === 0 && b0 > 0);
});

test("preço do tick considera as casas decimais", () => {
  assert.ok(Math.abs(tickToPrice(0, 18, 6) - 1e12) < 1);
  assert.ok(Math.abs(tickToPrice(0, 6, 6) - 1) < 1e-12);
});

test("crescimento de taxas dentro do intervalo", () => {
  const G = 1000n;
  // preço dentro: inside = global - fora_abaixo - fora_acima
  assert.equal(feeGrowthInside(G, 100n, 200n, 0, -10, 10), 700n);
  // preço acima da faixa: abaixo = fora_inferior; acima = global - fora_superior (invertido)
  assert.equal(feeGrowthInside(G, 100n, 200n, 50, -10, 10), mod(G - 100n - (G - 200n)));
  // aritmética de 256 bits não estoura com subtração "negativa"
  assert.ok(feeGrowthInside(10n, 50n, 0n, 0, -10, 10) >= 0n);
});
function mod(x: bigint) { const Q = 1n << 256n; return ((x % Q) + Q) % Q; }

test("taxas a coletar somam o devido ao crescimento desde a última leitura", () => {
  const Lq = 1_000_000n;
  // crescimento de 2^128 por unidade de liquidez = 1 token bruto por unidade de L
  assert.equal(uncollected(Lq, (1n << 128n) * 5n, (1n << 128n) * 3n, 7n), 2_000_000n + 7n);
  assert.equal(uncollected(Lq, 10n, 10n, 0n), 0n);
});

test("saúde da posição", () => {
  assert.equal(healthOf(0, -100, 100).health, "ok");
  assert.equal(healthOf(95, -100, 100).health, "attention");
  assert.equal(healthOf(-95, -100, 100).health, "attention");
  assert.equal(healthOf(100, -100, 100).health, "out");
  assert.equal(healthOf(-101, -100, 100).health, "out");
});

import { summarize, valueSeries, type LpEvent } from "../src/lib/lpperf";

test("desempenho: confere com o exemplo do Revert (AAVE/WETH)", () => {
  const events: LpEvent[] = [
    { ts: 1760296500, kind: "inc", liq: 1e18, a0: 0.55684522, a1: 21.073979 },
    { ts: 1765000000, kind: "col", liq: 0, a0: 0.06117014, a1: 1.07588325 },
  ];
  const p = summarize(events, { t: 1760296500 + 389.2 * 86400, amount0: 0.32900005, amount1: 24.9089018, fees0: 0.1109845, fees1: 1.90429501, u0: 2230.82, u1: 127.05 })!;
  assert.ok(Math.abs(p.divergenceUsd - -20.84) < 1.5);
  assert.ok(Math.abs(p.pnlUsd - 740.7) < 3);
  assert.ok(Math.abs(p.roi - 0.1892) < 0.002);
  assert.ok(Math.abs(p.avgDailyFeesUsd - 1.96) < 0.05);
  assert.equal(summarize([], { t: 1, amount0: 0, amount1: 0, fees0: 0, fees1: 0, u0: 1, u1: 1 }), null);
});

test("série de valor: sem divergência quando o preço não muda", () => {
  const ev: LpEvent[] = [{ ts: 0, kind: "inc", liq: 1e6, a0: 0, a1: 0 }];
  const s = valueSeries(ev, -1000, 1000, 18, 18, [[86400, 100], [172800, 100]], [[86400, 100], [172800, 100]]);
  assert.equal(s.length, 2);
  assert.ok(s[0].value > 0 && Math.abs(s[0].value - s[1].value) < 1e-9);
});

import { splitSpam, type LpPosition, type LpResult } from "../src/lib/lppositions";
test("posições de lixo (abaixo de US$ 2 ou sem preço) ficam ocultas", () => {
  const mk = (valueUsd: number | null) => ({ valueUsd } as LpPosition);
  const res: LpResult = { address: "0x", fetchedAt: 0, chains: [{ chain: "Unichain", positions: [mk(null), mk(1.5), mk(2), mk(900)] }] };
  const { shown, hidden } = splitSpam(res);
  assert.equal(shown.chains[0].positions.length, 2);
  assert.equal(hidden.length, 2);
});

import { rankPositions } from "../src/lib/toppositions";
test("Pools Position: PnL, ROI e filtro de valor mínimo", () => {
  const pool = { id: "p", feeTier: "3000", sqrtPrice: String(Math.sqrt(1) * 2 ** 96), tick: "0", token0: { id: "a", symbol: "A", decimals: "18" }, token1: { id: "b", symbol: "B", decimals: "18" } };
  const mk = (id: string, L: string, dep: string) => ({ id, owner: "0xabc", liquidity: L, tickLower: { tickIdx: "-1000" }, tickUpper: { tickIdx: "1000" }, depositedToken0: dep, depositedToken1: dep, withdrawnToken0: "0", withdrawnToken1: "0", collectedFeesToken0: "1", collectedFeesToken1: "1", transaction: { timestamp: String(1000) } });
  const out = rankPositions(pool, [mk("1", "1" + "0".repeat(21), "10"), mk("2", "1000", "10")], 100, 100, 1000 + 100 * 86400);
  assert.equal(out.length, 1); // a posição de liquidez minúscula vale menos de US$ 2 e some
  assert.ok(out[0].inRange && out[0].ageDays === 100);
  assert.ok(Math.abs(out[0].pnlUsd - (out[0].valueUsd + 200 - 2000)) < 1e-6);
});
