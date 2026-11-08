import { cached, fetchJson, getAllPools, type DefiPool } from "./market";
import { feeFromMeta, llamaUrl, poolLink, type PoolLink } from "./poollinks";
import { loadDistribution, TICK_SPACING, type Distribution } from "./liquidity";
import { poolKind, turnover } from "./pools";

/** Nome da rede no DefiLlama (coins.llama.fi). Rede fora da lista = sem preço, e o usuário digita o preço atual. */
export const COIN_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Arbitrum: "arbitrum", Optimism: "optimism", "OP Mainnet": "optimism", Polygon: "polygon", Base: "base",
  BSC: "bsc", Avalanche: "avax", Gnosis: "xdai", Fantom: "fantom", Celo: "celo", Linea: "linea", Scroll: "scroll", Blast: "blast",
  Mantle: "mantle", Sonic: "sonic", Unichain: "unichain", Berachain: "berachain", Solana: "solana", "zkSync Era": "era",
};

/** Rede no DexScreener (gráfico de preço incorporado). */
export const DEXS_CHAIN: Record<string, string> = {
  Ethereum: "ethereum", Base: "base", Arbitrum: "arbitrum", Polygon: "polygon", BSC: "bsc", Optimism: "optimism", "OP Mainnet": "optimism",
  Avalanche: "avalanche", Solana: "solana", Fantom: "fantom", Linea: "linea", Scroll: "scroll", Blast: "blast", Mantle: "mantle",
  Sonic: "sonic", Unichain: "unichain", Berachain: "berachain", Celo: "celo", Gnosis: "gnosischain", "zkSync Era": "zksync",
};
/** Rede no GeckoTerminal (histórico de preço do pool). */
export const GECKO_NET: Record<string, string> = {
  Ethereum: "eth", Base: "base", Arbitrum: "arbitrum", Polygon: "polygon_pos", BSC: "bsc", Optimism: "optimism", "OP Mainnet": "optimism",
  Avalanche: "avax", Fantom: "ftm", Linea: "linea", Scroll: "scroll", Blast: "blast", Mantle: "mantle", Sonic: "sonic", Unichain: "unichain",
  Berachain: "berachain", Celo: "celo", Gnosis: "xdai", "zkSync Era": "zksync", Solana: "solana",
};
const ADDR = /^0x[0-9a-fA-F]{40}$/;

export interface PricePoint { t: number; c: number }

/** Preço diário (fechamento, em US$) do primeiro token do pool, últimos ~90 dias. Vazio se a fonte não responder. */
export async function getPoolPriceHistory(chain: string, address: string): Promise<PricePoint[]> {
  const net = GECKO_NET[chain];
  if (!net || !(ADDR.test(address) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))) return [];
  const res = await cached<PricePoint[]>(`gtprice:${net}:${address.toLowerCase()}`, 30 * 60, async () => {
    const r = await fetchJson<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(`https://api.geckoterminal.com/api/v2/networks/${net}/pools/${address}/ohlcv/day?aggregate=1&limit=90`, {}, 12000);
    return (r.data?.attributes?.ohlcv_list ?? [])
      .filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[4]))
      .map((x) => ({ t: x[0] * 1000, c: x[4] }))
      .sort((a, b) => a.t - b.t);
  });
  return res.data ?? [];
}

export interface HistPoint { t: number; apy: number | null; apyBase: number | null; tvl: number | null }

/** Histórico diário de APR e TVL do pool (DefiLlama), no máximo ~120 pontos. */
export async function getPoolHistory(id: string): Promise<HistPoint[]> {
  if (!/^[0-9a-fA-F-]{20,40}$/.test(id)) return [];
  const res = await cached<HistPoint[]>(`llamachart:${id}`, 30 * 60, async () => {
    const r = await fetchJson<{ data?: { timestamp?: string; tvlUsd?: number; apy?: number | null; apyBase?: number | null }[] }>(`https://yields.llama.fi/chart/${id}`, {}, 15000);
    const pts = (r.data ?? []).map((d) => ({ t: d.timestamp ? Date.parse(d.timestamp) : NaN, apy: d.apy ?? null, apyBase: d.apyBase ?? null, tvl: d.tvlUsd ?? null })).filter((d) => Number.isFinite(d.t));
    return pts.slice(-120);
  });
  return res.data ?? [];
}

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
  /** Valor (US$) da liquidez ativa do pool em faixa total, base do cálculo de ganhos. fromChain = lido da blockchain (preciso); senão usa o TVL (aproximado). */
  poolValueUsd: number; poolValueFromChain: boolean;
  /** Preço do primeiro token em unidades do segundo (ex.: NVDA em USDG); null quando não há preço confiável. */
  price: number | null; usdA: number | null; usdB: number | null; priceNote: string | null;
  link: PoolLink; llama: string;
  /** Gráfico de preço do DexScreener: endereço do par (ou do token, que o DexScreener resolve para o par principal). */
  chart: { chain: string; address: string; embed: string; page: string } | null;
  history: HistPoint[];
  priceHistory: PricePoint[];
  /** Distribuição de liquidez (Uniswap v3), lida da blockchain; null quando não disponível. */
  dist: Distribution | null;
  fetchedAt: number | null;
}

const split2 = (symbol: string): [string, string] | null => {
  const parts = symbol.split(/[-/ +]/).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
};

export async function usdPrices(chain: string, tokens: string[]): Promise<Record<string, number>> {
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
  const history = await getPoolHistory(p.id).catch(() => []);
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
  const price = usdA && usdB ? usdA / usdB : null;
  const sym = split2(p.symbol);
  const link = poolLink(p);
  const poolAddr = link.kind === "direct" ? link.url.split("/").pop() ?? "" : "";
  const dist = p.project === "uniswap-v3" && ADDR.test(poolAddr) && hasTok && feeUnits && TICK_SPACING[feeUnits]
    ? (await cached<Distribution | null>(`liqdist:${poolAddr.toLowerCase()}`, 10 * 60, async () => loadDistribution(p.chain, poolAddr, p.tokens[0], feeUnits).catch(() => null))).data
    : null;
  const ds = DEXS_CHAIN[p.chain];
  const tail = link.url.split("/").pop() ?? "";
  const address = ADDR.test(tail) && link.kind === "direct" ? tail : hasTok ? p.tokens[0] : null;
  const tok1Usd = dist?.token1IsA ? usdA : usdB;
  const chainValue = dist?.activeValueToken1 && tok1Usd ? dist.activeValueToken1 * tok1Usd : null;
  const poolValueUsd = chainValue && chainValue > 0 ? chainValue : p.tvlUsd;
  const poolValueFromChain = !!(chainValue && chainValue > 0);
  const fees24hV = p.volumeUsd1d !== null && feeRate !== null ? p.volumeUsd1d * feeRate : null;
  const baseApr = fees24hV !== null ? ((fees24hV * 365) / poolValueUsd) * 100 : null;
  const chart = ds && address ? { chain: ds, address, embed: `https://dexscreener.com/${ds}/${address}?embed=1&theme=dark&trades=0&info=0&loadChartSettings=0`, page: `https://dexscreener.com/${ds}/${address}` } : null;
  const priceHistory = link.kind === "direct" && ADDR.test(tail) ? await getPoolPriceHistory(p.chain, tail).catch(() => []) : [];
  return {
    id: p.id, symbol: p.symbol, tokens: hasTok ? [p.tokens[0], p.tokens[1]] : null, project: p.project, chain: p.chain, poolMeta: p.poolMeta,
    stablecoin: p.stablecoin, rwa: poolKind(p) === "rwa", tvlUsd: p.tvlUsd, volumeUsd1d: p.volumeUsd1d, turnover: turnover(p),
    apy: p.apy, apyBase: p.apyBase, apyReward: p.apyReward, apyMean30d: p.apyMean30d, il7d: p.il7d,
    feeRate, feeFromDex, poolValueUsd, poolValueFromChain, fees24h: p.volumeUsd1d !== null && feeRate !== null ? p.volumeUsd1d * feeRate : null, baseApr,
    price, usdA, usdB,
    priceNote: price ? null : sym ? `Não encontramos o preço de ${sym[0]} automaticamente. Digite o preço atual para simular.` : "Preço indisponível. Digite o preço atual para simular.",
    link, llama: llamaUrl(p), chart, history, priceHistory, dist, fetchedAt: all.fetchedAt,
  };
}
