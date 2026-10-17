import test from "node:test";
import assert from "node:assert/strict";
import { chartHref, chartLinks, cleanCoinId, cleanTicker, tradingViewSymbol } from "../src/lib/charts";

test("monta o símbolo do TradingView para cripto e B3", () => {
  assert.equal(tradingViewSymbol("cripto", "BTC"), "BINANCE:BTCUSDT");
  assert.equal(tradingViewSymbol("cripto", "USDT"), "KRAKEN:USDTUSD");
  assert.equal(tradingViewSymbol("b3", "PETR4"), "BMFBOVESPA:PETR4");
  assert.equal(tradingViewSymbol("b3", "HGLG11"), "BMFBOVESPA:HGLG11");
  assert.equal(tradingViewSymbol("cripto", "FIGR_HELOC"), null);
});

test("valida o que vem da URL", () => {
  assert.equal(cleanTicker("petr4"), "PETR4");
  assert.equal(cleanTicker("<script>"), null);
  assert.equal(cleanTicker("A"), null);
  assert.equal(cleanTicker("BTC/USD"), null);
  assert.equal(cleanCoinId("bitcoin"), "bitcoin");
  assert.equal(cleanCoinId("x/../y"), null);
});

test("links de apoio e endereço interno", () => {
  assert.deepEqual(chartLinks("cripto", "ETH", "ethereum").map((l) => l.url), [
    "https://www.tradingview.com/chart/?symbol=BINANCE%3AETHUSDT",
    "https://www.coingecko.com/en/coins/ethereum",
  ]);
  assert.equal(chartLinks("b3", "ITUB4", null)[1].url, "https://www.google.com/finance/quote/ITUB4:BVMF");
  assert.equal(chartHref("b3", "PETR4", { nome: "Petrobras", de: "acoes" }), "/painel/grafico?tipo=b3&ativo=PETR4&nome=Petrobras&de=acoes");
});
