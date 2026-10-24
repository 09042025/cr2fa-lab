import test from "node:test";
import assert from "node:assert/strict";
import { aggregateCandles, mergeCandles, type Candle } from "../src/lib/candles-core";

const D = 86_400_000;
const day = (n: number) => Date.UTC(2024, 0, 1) + n * D; // 1/1/2024 é segunda

test("semanais começam na segunda e somam O/H/L/C/volume", () => {
  const daily: Candle[] = Array.from({ length: 10 }, (_, i) => [day(i), 100 + i, 110 + i, 90 + i, 105 + i, 1]);
  const w = aggregateCandles(daily, "1W");
  assert.equal(w.length, 2);
  assert.deepEqual(w[0], [day(0), 100, 116, 90, 111, 7]);
  assert.equal(w[1][0], day(7));
  assert.equal(w[1][5], 3);
});

test("mensais agrupam por mês", () => {
  const daily: Candle[] = Array.from({ length: 40 }, (_, i) => [day(i), 10, 12, 8, 11, 2]);
  const m = aggregateCandles(daily, "1M");
  assert.equal(m.length, 2);
  assert.equal(m[0][0], Date.UTC(2024, 0, 1));
  assert.equal(m[0][5], 62);
  assert.equal(m[1][0], Date.UTC(2024, 1, 1));
});

test("mergeCandles usa a bolsa quando há vela e o fechamento quando não há", () => {
  const start = Math.floor(day(0) / D);
  const ex: Candle[] = [[day(1), 5, 9, 4, 8, 3], [day(3), 1, 2, 1, 2, 1]];
  const out = mergeCandles(ex, [10, null, 12], start);
  assert.deepEqual(out[0], [day(0), 10, 10, 10, 10, 0]);
  assert.deepEqual(out[1], [day(1), 5, 9, 4, 8, 3]);
  assert.deepEqual(out[2], [day(2), 12, 12, 12, 12, 0]);
  assert.deepEqual(out[3], [day(3), 1, 2, 1, 2, 1]);
  assert.equal(out.length, 4);
});

test("aggregate 1D devolve as mesmas velas", () => {
  const daily: Candle[] = [[day(0), 1, 2, 1, 2, 1]];
  assert.equal(aggregateCandles(daily, "1D"), daily);
});
