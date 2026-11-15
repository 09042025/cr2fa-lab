import test from "node:test";
import assert from "node:assert/strict";
import { sortRows, validOrdem } from "../src/lib/sortlist";

const r = (symbol: string, volume: number | null, changePct: number | null) => ({ symbol, price: 10, changePct, volume });
const rows = [r("A", 10, 1), r("B", null, -3), r("C", 500, 5)];
const ex = (s: string) => ({ A: { mc: 5, a: { points: 1, total: 10 } }, B: { mc: null, a: null }, C: { mc: 9, a: { points: 5, total: 10 } } } as Record<string, { mc: number | null; a: { points: number; total: number } | null }>)[s];

test("ordena por volume, valor de mercado, dia e atenção; sem dado vai pro fim", () => {
  assert.deepEqual(sortRows(rows, "volume", ex).map((x) => x.symbol), ["C", "A", "B"]);
  assert.deepEqual(sortRows(rows, "mercado", ex).map((x) => x.symbol), ["C", "A", "B"]);
  assert.deepEqual(sortRows(rows, "mercado_asc", ex).map((x) => x.symbol), ["A", "C", "B"]);
  assert.deepEqual(sortRows(rows, "baixa", ex).map((x) => x.symbol), ["B", "A", "C"]);
  assert.deepEqual(sortRows(rows, "atencao", ex).map((x) => x.symbol), ["C", "A", "B"]);
  assert.deepEqual(sortRows(rows, undefined, ex).map((x) => x.symbol), ["A", "B", "C"]);
  assert.equal(validOrdem("xpto"), undefined);
});
