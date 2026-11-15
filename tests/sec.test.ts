import { test } from "node:test";
import assert from "node:assert/strict";
import { reduceFacts } from "../src/lib/sec";
import { usIndicators } from "../src/lib/usassess";

const yr = (end: string, val: number) => ({ start: `${Number(end.slice(0, 4)) - 1}-${end.slice(5)}`, end, val, form: "10-K", fp: "FY" });
const facts = {
  facts: {
    "us-gaap": {
      Revenues: { units: { USD: [yr("2024-12-31", 900), yr("2025-12-31", 1000)] } },
      NetIncomeLoss: { units: { USD: [yr("2024-12-31", 80), yr("2025-12-31", 120)] } },
      StockholdersEquity: { units: { USD: [{ end: "2025-12-31", val: 600, form: "10-K" }, { end: "2026-06-30", val: 650, form: "10-Q" }] } },
      Assets: { units: { USD: [{ end: "2026-06-30", val: 2000, form: "10-Q" }] } },
    },
    dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: "2026-07-20", val: 50 }] } } },
  },
};

test("reduceFacts pega o exercício mais recente, o anterior e o balanço mais novo", () => {
  const f = reduceFacts(facts);
  assert.equal(f.revenue, 1000);
  assert.equal(f.revenuePrev, 900);
  assert.equal(f.netIncome, 120);
  assert.equal(f.equity, 650);
  assert.equal(f.liabilities, 1350);
  assert.equal(f.shares, 50);
  assert.equal(f.period, "2025-12-31");
});

test("usIndicators calcula margem, ROE e crescimento", () => {
  const f = reduceFacts(facts);
  const ind = usIndicators(f, { price: 60, avgDailyVolume: null, dividends: [], monthly: [], close30: null }, false, "2026-11-15");
  const get = (id: string) => ind.find((i) => i.id === id)!;
  assert.equal(Math.round(get("margin").value!), 12);
  assert.equal(Math.round(get("gr").value!), 11);
  assert.equal(get("pl").value, 25); // 60 * 50 / 120
});
