import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBuy, applySell, evolution, lastMonths, monthlyIncome } from "../src/lib/portfolio-calc";

test("preço médio estilo B3: compra pondera, venda não muda a média", () => {
  const a = applyBuy(100, 10, 100, 20);
  assert.equal(a.qty, 200);
  assert.equal(a.avg, 15);
  assert.deepEqual(applySell(200, 15, 50), { qty: 150, avg: 15 });
  assert.equal(applySell(10, 15, 50).qty, 0);
  assert.equal(applyBuy(0, null, 10, 5).avg, 5);
});

test("dividendos por mês: repete os últimos 12 meses vezes a quantidade", () => {
  const divs = [{ date: "2026-03-10", value: 0.5 }, { date: "2026-09-10", value: 0.7 }, { date: "2025-01-10", value: 9 }];
  const m = monthlyIncome([{ ticker: "AAAA3", qty: 100, dividends: divs }], "2026-10-15");
  assert.equal(m.length, 12);
  assert.equal(m[0].month, "2026-10");
  const mar = m.find((x) => x.month === "2027-03");
  assert.equal(mar?.total, 50);
  assert.deepEqual(mar?.items.map((i) => [i.ticker, i.date, i.perShare, i.qty, i.total]), [["AAAA3", "2026-03-10", 0.5, 100, 50]]);
  assert.equal(m.find((x) => x.month === "2027-01")?.total, 0); // 2025 já saiu da janela
  assert.equal(Math.round(m.reduce((a, x) => a + x.total, 0) * 100) / 100, 120);
});

test("evolução usa o último fechamento até o mês e soma o valor fixo", () => {
  const months = lastMonths("2026-10-15", 3);
  assert.deepEqual(months, ["2026-08", "2026-09", "2026-10"]);
  const e = evolution([{ qty: 10, monthly: [{ m: "2026-08", close: 10 }, { m: "2026-10", close: 12 }] }], 100, months);
  assert.deepEqual(e.map((x) => x.value), [200, 200, 220]);
  assert.ok(e.every((x) => x.ok));
  assert.equal(evolution([{ qty: 1, monthly: [{ m: "2026-10", close: 1 }] }], 0, months)[0].ok, false);
});
