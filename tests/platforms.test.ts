import test from "node:test";
import assert from "node:assert/strict";
import { aggregateTvl, aggregateVolumes, DEFI_PLATFORMS, DEXES, EXCHANGES } from "../src/lib/platforms";

test("lista curada: links https, sem duplicados e regex coerentes", () => {
  const all = [...DEFI_PLATFORMS, ...DEXES];
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  for (const p of all) assert.match(p.url, /^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i, p.name);
  for (const x of EXCHANGES) assert.match(x.url, /^https:\/\//, x.name);
  assert.ok(EXCHANGES.some((x) => x.origin === "Brasil") && EXCHANGES.some((x) => x.origin === "Global"));
  const fluid = DEFI_PLATFORMS.find((p) => p.id === "fluid")!;
  assert.ok(fluid.match.test("fluid-lending") && fluid.match.test("fluid-dex"));
  assert.ok(!DEXES.some((d) => d.id.startsWith("fluid")), "Fluid DEX fica em Plataformas DeFi");
  for (const id of ["jupiter", "cowswap", "1inch"]) assert.ok(DEXES.some((d) => d.id === id) && !DEFI_PLATFORMS.some((d) => d.id === id), id);
  assert.ok(!DEFI_PLATFORMS.find((p) => p.id === "aave")!.match.test("aavegotchi"));
});

test("aggregateTvl soma versões, calcula TVL por rede e variação ponderada", () => {
  const raw = [
    { slug: "aave-v3", tvl: 30e9, change_7d: 2, chains: ["Ethereum", "Base"], chainTvls: { Ethereum: 25e9, Base: 5e9, "Ethereum-borrowed": 9e9 } },
    { slug: "aave-v2", tvl: 10e9, change_7d: -2, chains: ["Ethereum"], chainTvls: { Ethereum: 10e9 } },
    { slug: "kamino-lend", tvl: 2e9, change_7d: null, chains: ["Solana"], chainTvls: { Solana: 2e9 } },
    { slug: "aavegotchi", tvl: 1e6, chains: ["Polygon"], chainTvls: { Polygon: 1e6 } },
    { slug: "morpho-blue", tvl: 0, chains: [], chainTvls: {} },
  ];
  const r = aggregateTvl(raw, DEFI_PLATFORMS);
  assert.equal(r.aave.tvl, 40e9);
  assert.equal(r.aave.chains.Ethereum, 35e9);
  assert.equal(r.aave.chains.Base, 5e9);
  assert.equal(r.aave.chains["Ethereum-borrowed"], undefined);
  assert.equal(r.aave.change7d, 1);
  assert.equal(r.kamino.change7d, null);
  assert.equal(r.morpho, undefined);
  assert.equal(r.aavegotchi, undefined);
});

test("aggregateVolumes: usa o projeto já somado quando existe, senão soma as versões", () => {
  const raw = [
    { name: "Uniswap", slug: "uniswap", total24h: 3, total7d: 20, total30d: 90, total1y: 900, childProtocols: [{}, {}] },
    { name: "Uniswap V3", slug: "uniswap-v3", total24h: 2, total7d: 14, total30d: 60, total1y: 600 },
    { name: "Uniswap V2", slug: "uniswap-v2", total24h: 1, total7d: 6, total30d: 30, total1y: 300 },
    { name: "Raydium CLMM", slug: "raydium-clmm", total24h: 5, total7d: 7, total30d: 9, total1y: null },
    { name: "Raydium AMM", slug: "raydium-amm", total24h: 1, total7d: 1, total30d: 1, total1y: null },
  ];
  const r = aggregateVolumes(raw, DEXES);
  assert.deepEqual(r.uniswap, { v24h: 3, v7d: 20, v30d: 90, v1y: 900 });
  assert.deepEqual(r.raydium, { v24h: 6, v7d: 8, v30d: 10, v1y: null });
  assert.equal(r.curve, undefined);
});
