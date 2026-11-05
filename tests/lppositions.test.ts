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
