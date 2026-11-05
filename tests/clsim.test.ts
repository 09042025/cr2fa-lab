import test from "node:test";
import assert from "node:assert/strict";
import { concentration, earnings, fullRangeApr, impermanentLoss, presetRange, split } from "../src/lib/clsim";

test("faixa total rende 1x; faixa estreita rende mais; fora da faixa rende 0", () => {
  assert.ok(Math.abs(concentration(100, 0, Infinity) - 1) < 1e-9);
  const narrow = concentration(100, 95, 105), wide = concentration(100, 70, 130);
  assert.ok(narrow > wide && wide > 1);
  assert.equal(concentration(100, 110, 120), 0);
  assert.equal(concentration(100, 80, 90), 0);
});

test("APR das taxas e ganhos estimados", () => {
  const apr = fullRangeApr(1_000_000, 0.003, 10_000_000)!; // 1M * 0,3% * 365 / 10M = 10,95%
  assert.ok(Math.abs(apr - 10.95) < 1e-9);
  assert.equal(fullRangeApr(null, 0.003, 1), null);
  const e = earnings(1000, 100, 0, Infinity, apr);
  assert.ok(Math.abs(e.year! - 109.5) < 1e-6);
  assert.ok(Math.abs(e.month! - 109.5 / 12) < 1e-6);
  assert.equal(earnings(1000, 100, 110, 120, apr).year, 0);
});

test("divisão entre tokens soma 100% e respeita os extremos", () => {
  const s = split(100, 90, 110)!;
  assert.ok(Math.abs(s.fracA + s.fracB - 1) < 1e-9);
  assert.deepEqual(split(100, 120, 130), { fracA: 1, fracB: 0 });
  assert.deepEqual(split(100, 70, 80), { fracA: 0, fracB: 1 });
  assert.ok(Math.abs(split(100, 0, Infinity)!.fracA - 0.5) < 1e-9);
});

test("perda impermanente: zero sem variação, negativa com variação", () => {
  assert.ok(Math.abs(impermanentLoss(100, 80, 120, 0)!) < 1e-9);
  assert.ok(impermanentLoss(100, 80, 120, 0.1)! < 0);
  // faixa total, preço dobra: perda clássica de ~5,7%
  assert.ok(Math.abs(impermanentLoss(100, 0, Infinity, 1)! + 5.719) < 0.01);
});

test("faixas prontas", () => {
  assert.deepEqual(presetRange(100, "full", false), [0, Infinity]);
  const [a, b] = presetRange(100, "narrow", false);
  assert.ok(Math.abs(a - 95) < 1e-9 && Math.abs(b - 105) < 1e-9);
});
