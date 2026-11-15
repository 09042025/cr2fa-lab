import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthly } from "../src/lib/benchmarks";

const d = (m: number, day: number) => `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/2025`;
test("junta CDI diário, IPCA mensal e Ibovespa em índice de fim de mês", () => {
  const cdi = [{ data: d(1, 2), valor: "0,05" }, { data: d(1, 31), valor: "0,05" }, { data: d(2, 28), valor: "0,05" }];
  const ipca = [{ data: d(1, 1), valor: "0,50" }, { data: d(2, 1), valor: "0,40" }];
  const ibov = [{ ts: Date.UTC(2025, 0, 15), close: 100000 }, { ts: Date.UTC(2025, 1, 15), close: 110000 }];
  const p = buildMonthly(cdi, ipca, ibov);
  assert.equal(p.length, 2);
  assert.ok(Math.abs(p[0].cdi - 100 * 1.0005 ** 2) < 1e-9);
  assert.ok(Math.abs(p[1].ipca - 100 * 1.005 * 1.004) < 1e-9);
  assert.ok(Math.abs((p[1].ibov ?? 0) - 110) < 1e-9);
});
test("sem dados suficientes devolve vazio", () => assert.deepEqual(buildMonthly([], [], []), []));
