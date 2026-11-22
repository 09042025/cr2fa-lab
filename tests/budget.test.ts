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
