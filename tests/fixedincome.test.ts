import test from "node:test";
import assert from "node:assert/strict";
import { irRate, simulate, cdbEquivalentPercent } from "../src/lib/fixedincome";

test("tabela regressiva de IR", () => {
  assert.equal(irRate(100), 0.225);
  assert.equal(irRate(180), 0.225);
  assert.equal(irRate(181), 0.2);
  assert.equal(irRate(361), 0.175);
  assert.equal(irRate(721), 0.15);
});

test("LCI/LCA não paga IR e CDB paga", () => {
  const base = { cdiAnnual: 10, selicAnnual: 10, amount: 10_000, days: 365, percentCdi: 100 };
  const lci = simulate({ ...base, kind: "lci_lca" });
  const cdb = simulate({ ...base, kind: "cdb" });
  assert.equal(lci.ir, 0);
  assert.ok(cdb.ir > 0);
  assert.ok(lci.net > cdb.net);
});

test("equivalência CDB x LCI", () => {
  const eq = cdbEquivalentPercent(90, 365);
  assert.ok(Math.abs(eq - 90 / 0.825) < 1e-9);
});
