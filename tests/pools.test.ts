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

import { feeFromMeta, llamaUrl, poolLink } from "../src/lib/poollinks";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

test("link direto para a página do pool na Uniswap v3 (endereço confere com o pool real)", () => {
  const p = raw({ pool: "u", underlyingTokens: [WETH, USDC], poolMeta: "0.3%" });
  assert.deepEqual(poolLink(p), { kind: "direct", name: "Uniswap", url: "https://app.uniswap.org/explore/pools/ethereum/0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8" });
  const p05 = raw({ pool: "u5", underlyingTokens: [USDC, WETH], poolMeta: "0.05%" });
  assert.equal(poolLink(p05).url, "https://app.uniswap.org/explore/pools/ethereum/0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640");
  const base = raw({ pool: "ub", chain: "Base", underlyingTokens: ["0x4200000000000000000000000000000000000006", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"], poolMeta: "0.05%" });
  assert.equal(poolLink(base).url, "https://app.uniswap.org/explore/pools/base/0xd0b53D9277642d899DF5C87A3966A349A798F224");
  assert.equal(feeFromMeta("0.05%"), 500);
  assert.equal(feeFromMeta("0.01%"), 100);
  assert.equal(feeFromMeta("0.00%"), null);
  assert.equal(feeFromMeta("abc"), null);
});

test("Uniswap v2 na Ethereum, e fallback para a página da DEX nos demais", () => {
  const v2 = raw({ pool: "v2", project: "uniswap-v2", underlyingTokens: [WETH, USDC], poolMeta: null });
  assert.equal(poolLink(v2).url, "https://app.uniswap.org/explore/pools/ethereum/0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc");
  const pk = raw({ pool: "k", project: "pancakeswap-amm-v3", chain: "BSC", underlyingTokens: [WETH, USDC], poolMeta: "0.25%" });
  assert.deepEqual(poolLink(pk), { kind: "home", name: "PancakeSwap", url: "https://pancakeswap.finance/liquidity/pools" });
  const v4 = raw({ pool: "v4", project: "uniswap-v4", underlyingTokens: [WETH, USDC] });
  assert.deepEqual(poolLink(v4), { kind: "home", name: "Uniswap", url: "https://app.uniswap.org/explore/pools/ethereum" });
  const hood = raw({ pool: "h", project: "uniswap-v4", chain: "Robinhood Chain", underlyingTokens: [] });
  assert.equal(poolLink(hood).url, "https://app.uniswap.org/explore/pools/robinhood");
  const polyV2 = raw({ pool: "pv2", project: "uniswap-v2", chain: "Polygon", underlyingTokens: [WETH, USDC] });
  assert.equal(poolLink(polyV2).kind, "home");
  const native = raw({ pool: "n", underlyingTokens: ["0x0000000000000000000000000000000000000000", USDC], poolMeta: "0.3%" });
  assert.equal(poolLink(native).kind, "home");
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

import { toPaprikaPool } from "../src/lib/market";

const HOOD_ID = "0xdd966537d39c76e84f05df1efd3bb38f1ef4f5928feee84b72240e1c70e02c19";
const hoodRaw = {
  id: HOOD_ID, dex_id: "uniswap_v4", dex_name: "Uniswap V4", chain: "robinhood", volume_usd_24h: 1.75, volume_usd_7d: 1.75, fee: null,
  liquidity_usd: 24641634.9, tokens: [
    { id: "0x5fc5dc8e93bb982f633101f78d8f679b5ba6d168", symbol: "USDG", name: "USDG Robinhood" },
    { id: "0xf1d958a5edd31308f02edd46cd9b6cc5e48fe8a4", symbol: "PONS", name: "Pons" },
  ],
};

test("pool da Robinhood Chain vindo do DexPaprika: sem taxa, com link direto na Uniswap", () => {
  const p = toPaprikaPool(hoodRaw, "Robinhood Chain")!;
  assert.equal(p.symbol, "USDG-PONS");
  assert.equal(p.project, "uniswap-v4");
  assert.equal(p.tvlUsd, 24641634.9);
  assert.equal(p.apy, null);
  assert.equal(p.stablecoin, false);
  assert.equal(p.dex, true);
  assert.equal(poolLink(p).url, `https://app.uniswap.org/explore/pools/robinhood/${HOOD_ID}`);
  assert.equal(llamaUrl(p), `https://dexpaprika.com/robinhood/pool/${HOOD_ID}`);
  assert.deepEqual(filterPools([p], { tipo: "liquidez", rede: "Robinhood Chain" }).map((x) => x.id), [p.id]);
});

test("DexPaprika: descarta dados incompletos e limpa símbolos", () => {
  assert.equal(toPaprikaPool({ ...hoodRaw, liquidity_usd: 0 }, "Robinhood Chain"), null);
  assert.equal(toPaprikaPool({ ...hoodRaw, tokens: [hoodRaw.tokens[0]] }, "Robinhood Chain"), null);
  assert.equal(toPaprikaPool({ ...hoodRaw, id: undefined }, "Robinhood Chain"), null);
  const dirty = toPaprikaPool({ ...hoodRaw, tokens: [{ id: "x", symbol: "<b>A</b>" }, { id: "y", symbol: "USDG" }] }, "Robinhood Chain")!;
  assert.equal(dirty.symbol, "bAb-USDG");
  assert.equal(dirty.tokens.length, 0);
  const stable = toPaprikaPool({ ...hoodRaw, tokens: [{ symbol: "USDG" }, { symbol: "USDC" }] }, "Robinhood Chain")!;
  assert.equal(stable.stablecoin, true);
  const odd = toPaprikaPool({ ...hoodRaw, id: "javascript:alert(1)" }, "Robinhood Chain")!;
  assert.equal(odd.poolRef, null);
  assert.equal(poolLink(odd).kind, "home");
});
