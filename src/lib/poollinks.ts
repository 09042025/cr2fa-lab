import type { DefiPool } from "./market";

/**
 * Links para abrir o pool na DEX oficial.
 *
 * Segurança: o endereço final nunca é montado com texto vindo da rede. Os hosts
 * são fixos, os tokens passam por validação de endereço hexadecimal (em market.ts)
 * e a taxa só entra se estiver numa lista de valores conhecidos.
 */

export type LinkKind = "direct" | "home" | "llama";
export interface PoolLink {
  url: string;
  kind: LinkKind;
  /** Nome para o texto de ajuda, ex.: "Uniswap". */
  name: string;
}

const HEX = /^0x[0-9a-fA-F]{40}$/;
const ADD_FEES = new Set([100, 500, 2500, 3000, 10000]);

/** "0.3%" -> 3000 (centésimos de ponto-base, padrão da Uniswap v3). */
export function feeFromMeta(meta: string | null): number | null {
  const m = meta?.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const fee = Math.round(Number(m[1]) * 10000);
  return ADD_FEES.has(fee) ? fee : null;
}

const UNISWAP_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Arbitrum: "arbitrum", Optimism: "optimism", Polygon: "polygon", Base: "base",
  BSC: "bnb", Avalanche: "avalanche", Blast: "blast", Celo: "celo",
};
const PANCAKE_CHAIN: Record<string, string> = { Ethereum: "eth", BSC: "bsc", Arbitrum: "arb", Base: "base", Linea: "linea" };
const CURVE_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Arbitrum: "arbitrum", Optimism: "optimism", Polygon: "polygon", Base: "base",
  Avalanche: "avalanche", Fantom: "fantom", Gnosis: "xdai",
};
const SUSHI_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Arbitrum: "arbitrum", Optimism: "optimism", Polygon: "polygon", Base: "base",
  BSC: "bsc", Avalanche: "avalanche",
};

interface Home { name: string; url: (chain: string) => string }
const HOMES: { test: RegExp; home: Home }[] = [
  { test: /^uniswap/, home: { name: "Uniswap", url: (c) => `https://app.uniswap.org/explore/pools${UNISWAP_CHAIN[c] ? `?chain=${UNISWAP_CHAIN[c]}` : ""}` } },
  { test: /^pancakeswap/, home: { name: "PancakeSwap", url: () => "https://pancakeswap.finance/liquidity/pools" } },
  { test: /^aerodrome/, home: { name: "Aerodrome", url: () => "https://aerodrome.finance/liquidity" } },
  { test: /^velodrome/, home: { name: "Velodrome", url: () => "https://velodrome.finance/liquidity" } },
  { test: /^camelot/, home: { name: "Camelot", url: () => "https://app.camelot.exchange/liquidity" } },
  { test: /^curve/, home: { name: "Curve", url: (c) => (CURVE_CHAIN[c] ? `https://curve.finance/dex/${CURVE_CHAIN[c]}/pools/` : "https://curve.finance/") } },
  { test: /^sushiswap/, home: { name: "SushiSwap", url: (c) => (SUSHI_CHAIN[c] ? `https://www.sushi.com/${SUSHI_CHAIN[c]}/explore/pools` : "https://www.sushi.com/") } },
  { test: /^balancer/, home: { name: "Balancer", url: () => "https://balancer.fi/pools" } },
  { test: /^raydium/, home: { name: "Raydium", url: () => "https://raydium.io/liquidity-pools/" } },
  { test: /^orca/, home: { name: "Orca", url: () => "https://www.orca.so/pools" } },
  { test: /^meteora/, home: { name: "Meteora", url: () => "https://app.meteora.ag/" } },
  { test: /^quickswap/, home: { name: "QuickSwap", url: () => "https://quickswap.exchange/#/pools" } },
  { test: /^(trader-?joe|lfj)/, home: { name: "LFJ", url: () => "https://lfj.gg/avalanche/pool" } },
  { test: /^aave/, home: { name: "Aave", url: () => "https://app.aave.com/markets/" } },
  { test: /^compound/, home: { name: "Compound", url: () => "https://app.compound.finance/" } },
  { test: /^morpho/, home: { name: "Morpho", url: () => "https://app.morpho.org/" } },
  { test: /^spark/, home: { name: "Spark", url: () => "https://app.spark.fi/" } },
  { test: /^lido/, home: { name: "Lido", url: () => "https://stake.lido.fi/" } },
  { test: /^kamino/, home: { name: "Kamino", url: () => "https://app.kamino.finance/" } },
  { test: /^jito/, home: { name: "Jito", url: () => "https://www.jito.network/staking/" } },
  { test: /^ethena/, home: { name: "Ethena", url: () => "https://app.ethena.fi/" } },
  { test: /^sky|^maker/, home: { name: "Sky", url: () => "https://app.sky.money/" } },
];

function tokenPair(p: DefiPool): [string, string] | null {
  return p.tokens.length === 2 && p.tokens.every((t) => HEX.test(t)) && p.tokens[0].toLowerCase() !== p.tokens[1].toLowerCase()
    ? [p.tokens[0], p.tokens[1]]
    : null;
}

export function llamaUrl(p: DefiPool): string {
  return `https://defillama.com/yields/pool/${encodeURIComponent(p.id)}`;
}

/**
 * Escolhe o melhor destino: par direto na DEX (quando dá), página da DEX/protocolo,
 * ou a página do pool no DefiLlama como último recurso.
 */
export function poolLink(p: DefiPool): PoolLink {
  const pair = tokenPair(p);
  const fee = feeFromMeta(p.poolMeta);

  if (pair) {
    const [a, b] = pair;
    if (p.project === "uniswap-v3" && fee && UNISWAP_CHAIN[p.chain]) {
      return { kind: "direct", name: "Uniswap", url: `https://app.uniswap.org/add/${a}/${b}/${fee}?chain=${UNISWAP_CHAIN[p.chain]}` };
    }
    if (p.project === "uniswap-v2" && UNISWAP_CHAIN[p.chain]) {
      return { kind: "direct", name: "Uniswap", url: `https://app.uniswap.org/add/v2/${a}/${b}?chain=${UNISWAP_CHAIN[p.chain]}` };
    }
    if (p.project === "pancakeswap-amm-v3" && fee && PANCAKE_CHAIN[p.chain]) {
      return { kind: "direct", name: "PancakeSwap", url: `https://pancakeswap.finance/add/${a}/${b}/${fee}?chain=${PANCAKE_CHAIN[p.chain]}` };
    }
  }

  const hit = HOMES.find((h) => h.test.test(p.project));
  if (hit) return { kind: "home", name: hit.home.name, url: hit.home.url(p.chain) };
  return { kind: "llama", name: "DefiLlama", url: llamaUrl(p) };
}
