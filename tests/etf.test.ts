import test from "node:test";
import assert from "node:assert/strict";
import { parseDate, parseFarside, parseFlow } from "../src/lib/etf";

test("parseFlow lê saídas entre parênteses, traço e milhares", () => {
  assert.equal(parseFlow("(110.3)"), -110.3);
  assert.equal(parseFlow("4.2"), 4.2);
  assert.equal(parseFlow("-"), null);
  assert.equal(parseFlow(""), null);
  assert.equal(parseFlow("1,234.5"), 1234.5);
  assert.equal(parseFlow("(1,234.5)"), -1234.5);
});

test("parseDate converte 23 Oct 2026", () => {
  assert.equal(parseDate("23 Oct 2026"), "2026-10-23");
  assert.equal(parseDate("5 Jan 2024"), "2024-01-05");
  assert.equal(parseDate("Total"), null);
});

test("parseFarside extrai fundos, linhas e total", () => {
  const row = (d: string, a: string, b: string, t: string) => `<tr><td><span>${d}</span></td><td>${a}</td><td>${b}</td><td><b>${t}</b></td></tr>`;
  const html = `<table><tr><th>Date</th><th><img alt="x"/>IBIT</th><th>FBTC</th><th>Total</th></tr>
    ${row("21 Oct 2026", "400.0", "100.5", "500.5")}${row("22 Oct 2026", "(600.0)", "(35.6)", "(635.6)")}
    ${row("23 Oct 2026", "(110.3)", "-", "(110.3)")}${row("24 Oct 2026", "1", "2", "3")}${row("25 Oct 2026", "1", "2", "3")}
    <tr><td>Total</td><td>1</td><td>2</td><td>3</td></tr></table>`;
  const r = parseFarside(html);
  assert.deepEqual(r.funds, ["IBIT", "FBTC"]);
  assert.equal(r.rows.length, 5);
  assert.deepEqual(r.rows[1], { date: "2026-10-22", flows: [-600, -35.6], total: -635.6 });
  assert.deepEqual(r.rows[2].flows, [-110.3, null]);
});

import { sumLiquidations } from "../src/lib/futures";
test("sumLiquidations soma corretoras na mesma data e ordena", () => {
  const out = sumLiquidations([
    { history: [{ t: 2, l: 10, s: 1 }, { t: 1, l: 5, s: 0 }] },
    { history: [{ t: 2, l: 4, s: 2 }, { t: 3 }] },
  ]);
  assert.deepEqual(out, [{ t: 1, longUsd: 5, shortUsd: 0 }, { t: 2, longUsd: 14, shortUsd: 3 }, { t: 3, longUsd: 0, shortUsd: 0 }]);
});
