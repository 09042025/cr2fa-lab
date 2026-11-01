import test from "node:test";
import assert from "node:assert/strict";
import { annualFromMonthly, minIncome, monthlyFromAnnual, pricePayment, schedule, summarize } from "../src/lib/financing";

test("parcela Price conhecida: 100 mil, 1% a.m., 12 meses = 8.884,88", () => {
  assert.ok(Math.abs(pricePayment(100000, 0.01, 12) - 8884.88) < 0.01);
});

test("taxa zero divide o valor igualmente", () => {
  assert.equal(pricePayment(12000, 0, 12), 1000);
});

test("Price zera o saldo e todas as parcelas são iguais", () => {
  const rows = schedule(200000, 1, 24, "price");
  assert.equal(rows.length, 24);
  assert.ok(Math.abs(rows[0].payment - rows[23].payment) < 0.01);
  assert.equal(rows[23].balance, 0);
  const s = summarize(rows);
  assert.ok(Math.abs(s.total - s.interest - 200000) < 0.01);
});

test("SAC: amortização constante e parcela decrescente", () => {
  const rows = schedule(120000, 1, 12, "sac");
  assert.ok(Math.abs(rows[0].amortization - 10000) < 1e-9);
  assert.ok(rows[0].payment > rows[11].payment);
  assert.ok(Math.abs(rows[0].payment - 11200) < 1e-6);
  assert.equal(rows[11].balance, 0);
});

test("SAC paga menos juros que Price no mesmo prazo", () => {
  const p = summarize(schedule(300000, 0.9, 240, "price"));
  const s = summarize(schedule(300000, 0.9, 240, "sac"));
  assert.ok(s.interest < p.interest);
});

test("seguros e tarifas entram em cada parcela", () => {
  const rows = schedule(100000, 1, 12, "price", 100);
  assert.ok(Math.abs(rows[0].payment - 8984.88) < 0.01);
  assert.equal(summarize(rows, 100).extraTotal, 1200);
});

test("conversão de taxas e renda mínima", () => {
  assert.ok(Math.abs(monthlyFromAnnual(12.682503) - 1) < 1e-4);
  assert.ok(Math.abs(annualFromMonthly(1) - 12.682503) < 1e-4);
  assert.equal(minIncome(3000), 10000);
  assert.deepEqual(schedule(0, 1, 12, "price"), []);
});
