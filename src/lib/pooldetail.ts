import { cached, fetchJson, getAllPools, type DefiPool } from "./market";
import { feeFromMeta, llamaUrl, poolLink, type PoolLink } from "./poollinks";
import { fullRangeApr } from "./clsim";
import { poolKind, turnover } from "./pools";

/** Nome da rede no DefiLlama (coins.llama.fi). Rede fora da lista = sem preço, e o usuário digita o preço atual. */
const COIN_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Arbitrum: "arbitrum", Optimism: "optimism", "OP Mainnet": "optimism", Polygon: "polygon", Base: "base",
  BSC: "bsc", Avalanche: "avax", Gnosis: "xdai", Fantom: "fantom", Celo: "celo", Linea: "linea", Scroll: "scroll", Blast: "blast",
  Mantle: "mantle", Sonic: "sonic", Unichain: "unichain", Berachain: "berachain", Solana: "solana", "zkSync Era": "era",
};

export interface PoolDetail {
  id: string; symbol: string; tokens: [string, string] | null; project: string; chain: string; poolMeta: string | null;
  stablecoin: boolean; rwa: boolean; tvlUsd: number; volumeUsd1d: number | null; turnover: number | null;
  apy: number | null; apyBase: number | null; apyReward: number | null; apyMean30d: number | null; il7d: number | null;
  /** Taxa do pool (0,0005 = 0,05%), da própria DEX ou deduzida do APR de taxas. */
  feeRate: number | null; feeFromDex: boolean;
  /** Taxas geradas em 24h (US$). */
  fees24h: number | null;
  /** APR de taxas da faixa total (%), base do simulador. */
  baseApr: number | null;
  /** Preço do primeiro token em unidades do segundo (ex.: NVDA em USDG); null quando não há preço confiável. */
  price: number | null; usdA: number | null; usdB: number | null; priceNote: string | null;
  link: PoolLink; llama: string;
  fetchedAt: number | null;
}

const split2 = (symbol: string): [string, string] | null => {
  const parts = symbol.split(/[-/ +]/).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
};

async function usdPrices(chain: string, tokens: string[]): Promise<Record<string, number>> {
  const c = COIN_CHAIN[chain];
  if (!c) return {};
  const keys = tokens.map((t) => `${c}:${t}`);
  const res = await cached<Record<string, number>>(`coinprice:${keys.join(",").toLowerCase()}`, 60, async () => {
    const r = await fetchJson<{ coins?: Record<string, { price?: number }> }>(`https://coins.llama.fi/prices/current/${keys.join(",")}`, {}, 10000);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.coins ?? {})) if (typeof v.price === "number" && v.price > 0) out[k.toLowerCase()] = v.price;
    return out;
  });
  const out: Record<string, number> = {};
  for (const t of tokens) { const v = res.data?.[`${c}:${t}`.toLowerCase()]; if (v) out[t] = v; }
  return out;
}

export async function getPoolDetail(id: string): Promise<PoolDetail | null> {
  const all = await getAllPools();
  const p: DefiPool | undefined = all.data?.find((x) => x.id === id && x.dex);
  if (!p) return null;
  const hasTok = p.tokens.length === 2;
  const prices = hasTok ? await usdPrices(p.chain, p.tokens) : {};
  const usdA = hasTok ? prices[p.tokens[0]] ?? null : null;
  const usdB = hasTok ? prices[p.tokens[1]] ?? null : null;
  const feeUnits = feeFromMeta(p.poolMeta);
  let feeRate: number | null = feeUnits ? feeUnits / 1_000_000 : null;
  let feeFromDex = feeRate !== null;
  // Sem taxa informada (Curve, Aerodrome...), deduz pela relação entre APR de taxas, TVL e volume.
  if (feeRate === null && p.apyBase && p.volumeUsd1d && p.volumeUsd1d > 0 && p.tvlUsd > 0) {
    feeRate = ((p.apyBase / 100) * p.tvlUsd) / (p.volumeUsd1d * 365);
    feeFromDex = false;
  }
  const baseApr = fullRangeApr(p.volumeUsd1d, feeRate, p.tvlUsd);
  const price = usdA && usdB ? usdA / usdB : null;
  const sym = split2(p.symbol);
  return {
    id: p.id, symbol: p.symbol, tokens: hasTok ? [p.tokens[0], p.tokens[1]] : null, project: p.project, chain: p.chain, poolMeta: p.poolMeta,
    stablecoin: p.stablecoin, rwa: poolKind(p) === "rwa", tvlUsd: p.tvlUsd, volumeUsd1d: p.volumeUsd1d, turnover: turnover(p),
    apy: p.apy, apyBase: p.apyBase, apyReward: p.apyReward, apyMean30d: p.apyMean30d, il7d: p.il7d,
    feeRate, feeFromDex, fees24h: p.volumeUsd1d !== null && feeRate !== null ? p.volumeUsd1d * feeRate : null, baseApr,
    price, usdA, usdB,
    priceNote: price ? null : sym ? `Não encontramos o preço de ${sym[0]} automaticamente. Digite o preço atual para simular.` : "Preço indisponível. Digite o preço atual para simular.",
    link: poolLink(p), llama: llamaUrl(p), fetchedAt: all.fetchedAt,
  };
}
