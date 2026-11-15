import test from "node:test";
import assert from "node:assert/strict";
import { isCritical, summarize } from "../src/lib/assess";
import type { Indicator } from "../src/lib/indicators";

const ind = (status: Indicator["status"]): Indicator => ({ id: status, label: status, display: "", value: 1, status, hint: "" });

test("summarize ignora indicadores informativos e conta por selo", () => {
  const s = summarize([ind("ruim"), ind("ruim"), ind("atencao"), ind("bom"), ind("nd")]);
  assert.deepEqual(s, { total: 4, bad: 2, warn: 1, good: 1 });
});

test("isCritical só quando MAIS de 50% está ruim", () => {
  assert.equal(isCritical({ total: 10, bad: 5 }), false);
  assert.equal(isCritical({ total: 10, bad: 6 }), true);
  assert.equal(isCritical({ total: 0, bad: 0 }), false);
});

import { isFiiTicker } from "../src/lib/assess";
test("units de empresas (TAEE11, KLBN11) não são tratadas como FII", () => {
  assert.equal(isFiiTicker("TAEE11"), false);
  assert.equal(isFiiTicker("KLBN11"), false);
  assert.equal(isFiiTicker("KNRI11"), true);
  assert.equal(isFiiTicker("PETR4"), false);
});
