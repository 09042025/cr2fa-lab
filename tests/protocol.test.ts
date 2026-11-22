import test from "node:test";
import assert from "node:assert/strict";
import { BLOCKS, DOLLAR_TARGET_PCT, blockDollarShare, dollarization, isDollarHolding, planAllocation, rebalance, splitCents, futureValue, projection } from "../src/lib/protocol";

test("os cinco blocos somam 100% e cada subdivisão soma 100%", () => {
  assert.equal(BLOCKS.length, 5);
  assert.equal(BLOCKS.reduce((a, b) => a + b.pct, 0), 100);
  for (const b of BLOCKS) {
    assert.equal(b.subs.reduce((a, s) => a + s.pct, 0), 100, b.name);
    for (const s of b.subs) if (s.children) assert.equal(s.children.reduce((a, c) => a + c.pct, 0), 100, s.label);
  }
});

test("exemplo de R$ 100.000 bate com o roteiro", () => {
  const plan = planAllocation(100_000_00);
  const get = (key: string, label: string) =>
    plan.find((p) => p.block.key === key)!.lines.find((l) => l.label.startsWith(label))!.cents / 100;
  assert.equal(plan.every((p) => p.totalCents === 20_000_00), true);
  assert.equal(get("cripto", "Bitcoin"), 12_000);
  assert.equal(get("cripto", "Ethereum"), 2_000);
  assert.equal(get("cripto", "Stablecoins"), 6_000);
  assert.equal(get("fiis", "Fundos de papel"), 2_000);
  assert.equal(get("acoes", "Ações brasileiras"), 10_000);
  assert.equal(get("acoes", "Energia"), 2_000);
  assert.equal(get("renda_fixa", "LCI"), 4_000);
  assert.equal(get("renda_fixa", "Renda fixa em dólar"), 10_000);
  assert.equal(get("oportunidades", "Dólar ou stablecoins"), 10_000);
});

test("splitCents preserva a soma exata", () => {
  const parts = splitCents(100, [1, 1, 1]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(splitCents(0, [20, 80]), [0, 0]);
});

test("rebalanceamento leva cada bloco a 20%", () => {
  const rows = rebalance({ cripto: 40_000_00, fiis: 10_000_00, acoes: 10_000_00, renda_fixa: 20_000_00, oportunidades: 20_000_00 });
  const cripto = rows.find((r) => r.block.key === "cripto")!;
  assert.equal(cripto.targetCents, 20_000_00);
  assert.equal(cripto.diffCents, -20_000_00);
  assert.equal(rows.reduce((a, r) => a + r.diffCents, 0), 0);
});

test("juros compostos: R$ 500/mês por 20 anos a 10% a.a. fica perto de R$ 360 mil", () => {
  const v = futureValue(500, 10, 20);
  assert.ok(v > 340_000 && v < 380_000, String(v));
});

test("projeção: valor inicial entra nos juros e a inflação desconta o valor", () => {
  const p = projection(10_000, 1_000, 10, 240, 5.5);
  const last = p[p.length - 1];
  assert.ok(Math.abs(last.nominal - futureValue(1_000, 10, 20, 10_000)) < 0.01);
  assert.equal(last.invested, 10_000 + 1_000 * 240);
  assert.ok(Math.abs(last.real - last.nominal / Math.pow(1.055, 20)) < 0.01);
  assert.ok(last.real < last.nominal);
  assert.equal(p[0].nominal, 10_000);
  const zero = projection(0, 1_000, 10, 12, 0);
  assert.ok(Math.abs(zero[12].real - zero[12].nominal) < 1e-6);
});

test("o desenho do protocolo fecha a meta de 50% em dólar (20 + 10 + 10 + 10)", () => {
  const share = (key: string) => (BLOCKS.find((b) => b.key === key)!.pct * blockDollarShare(BLOCKS.find((b) => b.key === key)!)) / 100;
  assert.equal(share("cripto"), 20);
  assert.equal(share("acoes"), 10);
  assert.equal(share("renda_fixa"), 10);
  assert.equal(share("oportunidades"), 10);
  assert.equal(share("fiis"), 0);
  assert.equal(BLOCKS.reduce((a, b) => a + (b.pct * blockDollarShare(b)) / 100, 0), DOLLAR_TARGET_PCT);
});

test("isDollarHolding: cripto sempre; ações por código/BDR/ETF; renda fixa e reserva pelo nome ou código", () => {
  const h = (block: any, label: string, ticker: string | null = null) => ({ block, label, ticker });
  assert.equal(isDollarHolding(h("cripto", "Bitcoin")), true);
  assert.equal(isDollarHolding(h("acoes", "Apple", "AAPL")), true);
  assert.equal(isDollarHolding(h("acoes", "Apple BDR", "AAPL34")), true);
  assert.equal(isDollarHolding(h("acoes", "S&P 500", "IVVB11")), true);
  assert.equal(isDollarHolding(h("acoes", "Banco do Brasil", "BBAS3")), false);
  assert.equal(isDollarHolding(h("acoes", "Petrobras", "PETR4")), false);
  assert.equal(isDollarHolding(h("acoes", "Taesa unit", "TAEE11")), false);
  assert.equal(isDollarHolding(h("renda_fixa", "Tesouro Selic 2029")), false);
  assert.equal(isDollarHolding(h("renda_fixa", "CDB C6")), false);
  assert.equal(isDollarHolding(h("renda_fixa", "US Treasury 10 anos")), true);
  assert.equal(isDollarHolding(h("renda_fixa", "Fundo renda fixa dólar")), true);
  assert.equal(isDollarHolding(h("oportunidades", "USDC", "USDC")), true);
  assert.equal(isDollarHolding(h("oportunidades", "Caixa em USD")), true);
  assert.equal(isDollarHolding(h("oportunidades", "Earn fintech")), true);
  assert.equal(isDollarHolding(h("oportunidades", "CDB liquidez diária")), false);
  assert.equal(isDollarHolding(h("fiis", "HGLG11", "HGLG11")), false);
});

test("dolarização: mede a parte em dólar contra a meta de 50%", () => {
  const items = [
    { block: "cripto" as const, label: "Bitcoin", ticker: "BTC", cents: 20_000_00 },
    { block: "fiis" as const, label: "HGLG11", ticker: "HGLG11", cents: 20_000_00 },
    { block: "acoes" as const, label: "Petrobras", ticker: "PETR4", cents: 10_000_00 },
    { block: "acoes" as const, label: "Apple", ticker: "AAPL", cents: 10_000_00 },
    { block: "renda_fixa" as const, label: "CDB C6", ticker: null, cents: 10_000_00 },
    { block: "renda_fixa" as const, label: "US Treasury", ticker: null, cents: 10_000_00 },
    { block: "oportunidades" as const, label: "CDB liquidez diária", ticker: null, cents: 10_000_00 },
    { block: "oportunidades" as const, label: "USDC", ticker: "USDC", cents: 10_000_00 },
  ];
  const d = dollarization(items);
  assert.equal(d.totalCents, 100_000_00);
  assert.equal(d.dollarCents, 50_000_00);
  assert.equal(d.pct, 50);
  assert.equal(d.diffPct, 0);
  assert.equal(d.gapCents, 0);
  assert.deepEqual(d.parts.map((p) => [p.key, p.pct, p.targetPct]), [["cripto", 20, 20], ["acoes", 10, 10], ["renda_fixa", 10, 10], ["oportunidades", 10, 10]]);
  const low = dollarization(items.filter((i) => i.block !== "oportunidades" || i.ticker === null));
  assert.ok(low.pct < 50 && low.gapCents > 0 && low.diffPct < 0);
  const empty = dollarization([]);
  assert.equal(empty.pct, 0);
  assert.equal(empty.gapCents, 0);
});
