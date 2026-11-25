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

import { SUBS, combineActual, daysInMonth, expenseLabel, rankSpending, validDay, type Expense } from "../src/lib/budget-calc";

const ex = (id: number, day: string, cat: Expense["cat"], sub: string, amount: number, note = ""): Expense => ({ id, day, cat, sub, amount, note, receiptId: null });

test("cada categoria tem 'Outros' no fim e datas são validadas", () => {
  for (const list of Object.values(SUBS)) assert.equal(list[list.length - 1], "Outros");
  assert.ok(validDay("2026-11-25"));
  assert.ok(!validDay("2026-13-01"));
  assert.ok(!validDay("2026-11-32"));
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(expenseLabel({ sub: "Outros", note: "Pet shop" }), "Pet shop");
  assert.equal(expenseLabel({ sub: "Mercado", note: "Carrefour" }), "Mercado");
});

test("gasto do mês soma o digitado com os lançamentos por dia", () => {
  const list = [ex(1, "2026-11-02", "alimentacao", "Mercado", 300), ex(2, "2026-11-10", "alimentacao", "Açougue", 100), ex(3, "2026-10-30", "alimentacao", "Mercado", 999)];
  const a = combineActual({ ...emptyAmounts(), alimentacao: 50, moradia: 1000 }, list, "2026-11");
  assert.equal(a.alimentacao, 450);
  assert.equal(a.moradia, 1000);
});

test("ranking anual agrupa por tipo de gasto, ignora a reserva e calcula percentuais", () => {
  const list = [
    ex(1, "2026-03-02", "alimentacao", "Mercado", 400), ex(2, "2026-04-02", "alimentacao", "Mercado", 600),
    ex(3, "2026-03-05", "alimentacao", "Fast food", 150), ex(4, "2026-03-06", "lazer", "Outros", 200, "Pet shop"),
    ex(5, "2026-03-07", "reserva", "Renda fixa", 5000), ex(6, "2025-03-07", "alimentacao", "Mercado", 9999),
  ];
  const months = [{ ym: "2026-03", income: 5000, actual: { ...emptyAmounts(), moradia: 1500 }, reserve: null }];
  const r = rankSpending(list, months, 2026);
  assert.deepEqual(r.items.map((i) => i.label), ["Moradia e contas da casa (sem detalhar)", "Mercado", "Pet shop", "Fast food"]);
  assert.equal(r.items.find((i) => i.label === "Mercado")!.total, 1000);
  assert.equal(r.totalSpend, 1500 + 1000 + 150 + 200);
  assert.equal(r.totalIncome, 5000);
  assert.ok(!r.items.some((i) => i.label === "Renda fixa"));
});
