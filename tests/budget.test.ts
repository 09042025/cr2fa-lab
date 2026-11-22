import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBudget, emptyAmounts, fmtMonths, idealAmounts, monthsToGoal, parseBRL } from "../src/lib/budget-calc";

test("lê valores em reais digitados de vários jeitos", () => {
  assert.equal(parseBRL("1.234,56"), 1234.56);
  assert.equal(parseBRL("1234,56"), 1234.56);
  assert.equal(parseBRL("8.000"), 8000);
  assert.equal(parseBRL("8000"), 8000);
  assert.equal(parseBRL("R$ 2.500,00"), 2500);
  assert.equal(parseBRL(""), 0);
});

test("divisão ideal soma 100% da renda", () => {
  const i = idealAmounts(10000);
  assert.equal(i.moradia, 3000);
  assert.equal(i.reserva, 2000);
  assert.equal(Object.values(i).reduce((a, b) => a + b, 0), 10000);
});

test("reserva de 12 meses usa o custo essencial real e calcula o tempo", () => {
  const actual = { ...emptyAmounts(), moradia: 2500, alimentacao: 1500, transporte: 500, saude: 500, lazer: 800, reserva: 500 };
  const r = computeBudget({ income: 8000, actual, reserveNow: 6000 });
  assert.equal(r.essentialMonthly, 5000);
  assert.equal(r.goal, 60000);
  assert.equal(r.falta, 54000);
  assert.equal(r.pct, 10);
  assert.equal(r.monthsNow, 108);
  assert.equal(r.monthsIdeal, 34); // 54000 / 1600 = 33,75
  assert.equal(r.sobra, 8000 - 6300);
});

test("sem gastos preenchidos usa o ideal; sem aporte não há prazo", () => {
  const r = computeBudget({ income: 10000, actual: emptyAmounts(), reserveNow: 0 });
  assert.equal(r.usedIdealEssentials, true);
  assert.equal(r.goal, 65000 * 12 / 10); // 6.500 essenciais x 12 = 78.000
  assert.equal(r.monthsNow, null);
  assert.equal(monthsToGoal(0, 0), 0);
  assert.equal(fmtMonths(null), "—");
  assert.equal(fmtMonths(0), "Meta atingida");
  assert.equal(fmtMonths(14), "1 ano e 2 meses");
  assert.equal(fmtMonths(24), "2 anos");
});

import { monthStats, validYm, ymOf } from "../src/lib/budget-calc";

test("estatística do mês compara com o ideal e mostra a sobra", () => {
  const actual = { ...emptyAmounts(), moradia: 3500, alimentacao: 1500, transporte: 800, saude: 700, lazer: 1000, reserva: 1000 };
  const s = monthStats(10000, actual);
  assert.equal(s.total, 8500);
  assert.equal(s.sobra, 1500);
  const mor = s.rows.find((r) => r.id === "moradia")!;
  assert.equal(mor.ideal, 3000);
  assert.equal(mor.diff, 500);
  assert.equal(mor.bad, true);
  const res = s.rows.find((r) => r.id === "reserva")!;
  assert.equal(res.diff, -1000);
  assert.equal(res.bad, true); // guardar menos que o ideal
  assert.equal(s.overspent, 500 + 0 + 0 + 0 + 0 + 0 + (1000 - 1500 > 0 ? 0 : 0)); // só moradia passou (lazer 1000 < 1500)
  assert.equal(monthStats(1000, { ...emptyAmounts(), moradia: 1200 }).sobra, -200);
});

test("meses válidos", () => {
  assert.equal(ymOf(2026, 10), "2026-11");
  assert.ok(validYm("2026-01"));
  assert.ok(!validYm("2026-13"));
  assert.ok(!validYm("26-01"));
});
