import test from "node:test";
import assert from "node:assert/strict";
import { concentration, earnings, impermanentLoss, presetRange, split } from "../src/lib/clsim";

test("faixa total rende 1x; faixa estreita rende mais; fora da faixa rende 0", () => {
  assert.ok(Math.abs(concentration(100, 0, Infinity) - 1) < 1e-9);
  const narrow = concentration(100, 95, 105), wide = concentration(100, 70, 130);
  assert.ok(narrow > wide && wide > 1);
  assert.equal(concentration(100, 110, 120), 0);
  assert.equal(concentration(100, 80, 90), 0);
});

test("ganhos estimados: confere com a Krystal (pool NVDA/USDG, faixa -23%/+43%, US$ 1.000)", () => {
  // Krystal: taxas 24h US$ 2.002, preço 182,82, faixa -23,05%..+42,85% => US$ 3,17/dia, 115,68% APR.
  // A liquidez ativa do pool (≈ US$ 4,4 mi em faixa total) vem da blockchain.
  const p = 182.82, pa = p * (1 - 0.2305), pb = p * 1.4285;
  const e = earnings(1000, p, pa, pb, 2002, 4_400_000);
  assert.ok(Math.abs(e.day! - 3.17) < 0.3, `dia ${e.day}`);
  assert.ok(Math.abs(e.apr! - 115.68) < 12, `apr ${e.apr}`);
});

test("ganhos: faixa total, fora da faixa, diluição e sem dados", () => {
  const full = earnings(1000, 100, 0, Infinity, 1000, 10_000_000); // 1000/10M da liquidez, fatia ~0,01%
  assert.ok(Math.abs(full.day! - 0.1) < 0.001);
  assert.equal(earnings(1000, 100, 110, 120, 1000, 10_000_000).day, 0);
  // um depósito igual à liquidez do pool leva metade das taxas
  assert.ok(Math.abs(earnings(1e7, 100, 0, Infinity, 1000, 1e7).day! - 500) < 1e-6);
  assert.equal(earnings(1000, 100, 0, Infinity, null, 1e7).year, null);
  assert.ok(Math.abs(full.month! - full.year! / 12) < 1e-9);
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

import { binProfile, buildProfile, decSigned, encInt, tickPrice } from "../src/lib/liquidity";

test("liquidez: codifica/decodifica inteiros com sinal", () => {
  assert.equal(encInt(5).slice(-2), "05");
  assert.equal(encInt(-1), "f".repeat(64));
  assert.equal(decSigned("0x" + "f".repeat(64), 0, 24), -1n);
  assert.equal(decSigned("0x" + "0".repeat(63) + "5", 0, 24), 5n);
  assert.equal(decSigned("0x" + "0".repeat(64) + "0".repeat(58) + "fffffe", 1, 24), -2n);
});

test("liquidez: perfil soma e subtrai o líquido ao cruzar ticks", () => {
  // posição entre ticks -120 e 120 com L=100; atual no tick 0
  const prof = buildProfile(0, 100, [{ tick: -120, net: 100 }, { tick: 120, net: -100 }]);
  const at = (t: number) => prof.find((s) => t >= s.from && t < s.to)!.l;
  assert.equal(at(0), 100); assert.equal(at(60), 100); assert.equal(at(-60), 100);
  assert.equal(at(200), 0); assert.equal(at(-200), 0);
});

test("liquidez: preço do tick e agrupamento em faixas", () => {
  assert.ok(Math.abs(tickPrice(0, 18, 18) - 1) < 1e-12);
  assert.ok(Math.abs(tickPrice(0, 18, 6) - 1e12) < 1);
  const d = binProfile(buildProfile(0, 100, [{ tick: -2000, net: 100 }, { tick: 2000, net: -100 }]), 0, 18, 18, false);
  assert.equal(d.bins.length, 80);
  assert.ok(d.bins[40] === 1);          // no centro há liquidez
  assert.ok(d.bins[0] === 0 && d.bins[79] === 0); // longe do centro não há
  assert.ok(Math.abs(d.center - 1) < 1e-9);
});
