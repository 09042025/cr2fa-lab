import test from "node:test";
import assert from "node:assert/strict";
import { isDexPool, toDefiPool } from "../src/lib/market";
import { estimateMonthly, filterPools, turnover } from "../src/lib/pools";

const raw = (o: Record<string, unknown>) =>
  toDefiPool({
    pool: String(o.pool ?? "x"), chain: "Ethereum", project: "uniswap-v3", symbol: "WETH-USDC", tvlUsd: 10_000_000,
    apy: 20, apyBase: 18, apyReward: 2, stablecoin: false, exposure: "multi", poolMeta: "0.05%",
    volumeUsd1d: 5_000_000, volumeUsd7d: 30_000_000, il7d: 0.4, ilRisk: "yes", apyMean30d: 19, ...o,
  } as never);

const pools = [
  raw({ pool: "a" }),
  raw({ pool: "b", chain: "Base", project: "aerodrome-slipstream", tvlUsd: 3_000_000, volumeUsd1d: 9_000_000, apy: 60, apyBase: 55 }),
  raw({ pool: "c", project: "aave-v3", exposure: "single", symbol: "USDC", poolMeta: null, volumeUsd1d: null, stablecoin: true, apy: 4, apyBase: 4, apyReward: 0 }),
  raw({ pool: "d", project: "curve-dex", symbol: "USDC-USDT", stablecoin: true, tvlUsd: 50_000_000, volumeUsd1d: 1_000_000, apy: 3, apyBase: 2 }),
];

test("classifica pools de DEX e deixa empréstimo de fora", () => {
  assert.equal(isDexPool("uniswap-v3", "multi"), true);
  assert.equal(isDexPool("aerodrome-slipstream", "multi"), true);
  assert.equal(isDexPool("aave-v3", "single"), false);
  assert.equal(isDexPool("uniswap-v3", "single"), false);
  assert.equal(isDexPool("beefy", "multi"), false);
  assert.equal(pools[2].volumeUsd1d, null);
  assert.equal(pools[0].ilRisk, true);
});

test("filtra por tipo, rede, DEX e volume", () => {
  assert.deepEqual(filterPools(pools, { tipo: "liquidez" }).map((p) => p.id), ["d", "a", "b"]);
  assert.deepEqual(filterPools(pools, { tipo: "rendimento" }).map((p) => p.id), ["c"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", rede: "Base" }).map((p) => p.id), ["b"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", dex: "curve-dex" }).map((p) => p.id), ["d"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", vol: "2000000" }).map((p) => p.id), ["a", "b"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", stable: "1" }).map((p) => p.id), ["d"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", q: "0.05%" }).map((p) => p.id), ["d", "a", "b"]);
});

test("ordena por APR, volume e giro; ordem inválida cai em TVL", () => {
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", ordem: "apy" }).map((p) => p.id), ["b", "a", "d"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", ordem: "vol" }).map((p) => p.id), ["b", "a", "d"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", ordem: "eficiencia" }).map((p) => p.id), ["b", "a", "d"]);
  assert.deepEqual(filterPools(pools, { tipo: "liquidez", ordem: "<script>" }).map((p) => p.id), ["d", "a", "b"]);
});

test("giro e estimativa mensal", () => {
  assert.equal(turnover(pools[1]), 3);
  assert.equal(turnover(pools[2]), null);
  assert.equal(estimateMonthly(1200, 12), 12);
  assert.equal(estimateMonthly(1000, null), null);
  assert.equal(estimateMonthly(0, 12), null);
});

import { feeFromMeta, poolLink } from "../src/lib/poollinks";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

test("link direto para Uniswap v3 com os dois tokens e a taxa", () => {
  const p = raw({ pool: "u", underlyingTokens: [WETH, USDC], poolMeta: "0.3%" });
  assert.deepEqual(poolLink(p), { kind: "direct", name: "Uniswap", url: `https://app.uniswap.org/add/${WETH}/${USDC}/3000?chain=ethereum` });
  assert.equal(feeFromMeta("0.05%"), 500);
  assert.equal(feeFromMeta("0.01%"), 100);
  assert.equal(feeFromMeta("0.00%"), null);
  assert.equal(feeFromMeta("abc"), null);
});

test("link do PancakeSwap v3 e fallback para a página da DEX", () => {
  const pk = raw({ pool: "k", project: "pancakeswap-amm-v3", chain: "BSC", underlyingTokens: [WETH, USDC], poolMeta: "0.25%" });
  assert.equal(poolLink(pk).url, `https://pancakeswap.finance/add/${WETH}/${USDC}/2500?chain=bsc`);
  const v4 = raw({ pool: "v4", project: "uniswap-v4", underlyingTokens: [WETH, USDC] });
  assert.deepEqual(poolLink(v4), { kind: "home", name: "Uniswap", url: "https://app.uniswap.org/explore/pools?chain=ethereum" });
  assert.equal(poolLink(raw({ pool: "c", project: "curve-dex", chain: "Arbitrum", underlyingTokens: [] })).url, "https://curve.finance/dex/arbitrum/pools/");
});

test("endereço inválido ou protocolo desconhecido nunca vira link direto", () => {
  const bad = raw({ pool: "b", underlyingTokens: ["javascript:alert(1)", USDC], poolMeta: "0.3%" });
  assert.equal(bad.tokens.length, 1);
  assert.equal(poolLink(bad).kind, "home");
  const unknown = raw({ pool: "id/with?odd", project: "projeto-novo", exposure: "single" });
  assert.deepEqual(poolLink(unknown), { kind: "llama", name: "DefiLlama", url: "https://defillama.com/yields/pool/id%2Fwith%3Fodd" });
  const same = raw({ pool: "s", underlyingTokens: [USDC, USDC], poolMeta: "0.3%" });
  assert.equal(poolLink(same).kind, "home");
});
