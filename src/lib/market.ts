import { db, now } from "./db";

/** Busca JSON com timeout. Lança erro em respostas não-2xx. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "cr2fa-lab/0.1", ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface Cached<T> {
  data: T | null;
  fetchedAt: number | null;
  stale: boolean;
  error?: string;
}

/**
 * Cache em SQLite. Se a busca falhar, devolve o último valor salvo (marcado como stale).
 * Nunca inventa dados: sem cache e sem rede, devolve data=null.
 */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<Cached<T>> {
  const row = db().prepare("SELECT value, fetched_at FROM cache WHERE key = ?").get(key) as
    | { value: string; fetched_at: number }
    | undefined;
  if (row && now() - row.fetched_at < ttlSec) {
    return { data: JSON.parse(row.value) as T, fetchedAt: row.fetched_at, stale: false };
  }
  try {
    const data = await load();
    const t = now();
    db()
      .prepare("INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at")
      .run(key, JSON.stringify(data), t);
    return { data, fetchedAt: t, stale: false };
  } catch (e) {
    const error = e instanceof Error ? e.message : "erro desconhecido";
    if (row) return { data: JSON.parse(row.value) as T, fetchedAt: row.fetched_at, stale: true, error };
    return { data: null, fetchedAt: null, stale: false, error };
  }
}

/* ============================ Cripto (CoinGecko) ============================ */

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  marketCapUsd: number;
  volumeUsd: number;
  change24h: number | null;
  change7d: number | null;
  change30d?: number | null;
  /** Logo da moeda (URL da CoinGecko). Ausente em registros antigos do cache. */
  image?: string | null;
}

interface GeckoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  image?: string | null;
}

function geckoHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

export function getCryptoMarkets() {
  return cached<CryptoCoin[]>("coingecko:markets", 5 * 60, async () => {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d";
    const raw = await fetchJson<GeckoCoin[]>(url, { headers: geckoHeaders() });
    return raw.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      priceUsd: c.current_price,
      marketCapUsd: c.market_cap,
      volumeUsd: c.total_volume,
      change24h: c.price_change_percentage_24h_in_currency ?? null,
      change7d: c.price_change_percentage_7d_in_currency ?? null,
      change30d: c.price_change_percentage_30d_in_currency ?? null,
      image: c.image ?? null,
    }));
  });
}

/** Uma página do ranking (por valor de mercado), opcionalmente de uma categoria da CoinGecko (ex.: "tokenized-stock"). */
export function getCryptoPage(page: number, category?: string, perPage = 100) {
  const pg = Math.min(Math.max(Math.floor(page) || 1, 1), 20);
  const cat = category && /^[a-z0-9-]{2,60}$/.test(category) ? category : "";
  return cached<CryptoCoin[]>(`coingecko:markets:v2:${cat || "all"}:${perPage}:${pg}`, 5 * 60, async () => {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${pg}&sparkline=false&price_change_percentage=24h,7d,30d${cat ? `&category=${cat}` : ""}`;
    const raw = await fetchJson<GeckoCoin[]>(url, { headers: geckoHeaders() });
    return raw.map((c) => ({
      id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, priceUsd: c.current_price, marketCapUsd: c.market_cap, volumeUsd: c.total_volume,
      change24h: c.price_change_percentage_24h_in_currency ?? null, change7d: c.price_change_percentage_7d_in_currency ?? null,
      change30d: c.price_change_percentage_30d_in_currency ?? null, image: c.image ?? null,
    }));
  });
}

export interface GlobalMarket {
  totalCapUsd: number | null;
  totalVolumeUsd: number | null;
  capChange24h: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  activeCoins: number | null;
}

/** Números globais do mercado cripto (CoinGecko). */
export function getGlobalMarket() {
  return cached<GlobalMarket>("coingecko:global:v1", 5 * 60, async () => {
    const raw = await fetchJson<{ data?: { total_market_cap?: { usd?: number }; total_volume?: { usd?: number }; market_cap_change_percentage_24h_usd?: number; market_cap_percentage?: { btc?: number; eth?: number }; active_cryptocurrencies?: number } }>(
      "https://api.coingecko.com/api/v3/global", { headers: geckoHeaders() });
    const d = raw.data;
    if (!d) throw new Error("resposta vazia da CoinGecko");
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      totalCapUsd: n(d.total_market_cap?.usd), totalVolumeUsd: n(d.total_volume?.usd), capChange24h: n(d.market_cap_change_percentage_24h_usd),
      btcDominance: n(d.market_cap_percentage?.btc), ethDominance: n(d.market_cap_percentage?.eth), activeCoins: n(d.active_cryptocurrencies),
    };
  });
}

export interface FearGreed { value: number; label: string; history: { value: number; ts: number }[] }

/** Índice de Medo e Ganância (alternative.me), com os últimos 30 dias. */
export function getFearGreed() {
  return cached<FearGreed>("altme:fng:v1", 60 * 60, async () => {
    const raw = await fetchJson<{ data?: { value: string; value_classification: string; timestamp: string }[] }>("https://api.alternative.me/fng/?limit=30");
    const rows = (raw.data ?? []).map((r) => ({ value: Number(r.value), ts: Number(r.timestamp), cls: r.value_classification })).filter((r) => Number.isFinite(r.value));
    if (!rows.length) throw new Error("sem dados do índice");
    return { value: rows[0].value, label: rows[0].cls, history: rows.map((r) => ({ value: r.value, ts: r.ts })) };
  });
}


export interface CoinDetail {
  id: string; symbol: string; name: string; image: string | null; rank: number | null;
  price: number | null; marketCap: number | null; fdv: number | null; volume: number | null;
  circulating: number | null; total: number | null; max: number | null;
  ath: number | null; athDate: string | null; atl: number | null; atlDate: string | null;
  change24h: number | null; change7d: number | null; change30d: number | null; change1y: number | null;
  description: string; homepage: string | null; explorers: string[]; twitter: string | null;
  categories: string[]; contracts: { platform: string; address: string }[];
}

interface GeckoDetail {
  id: string; symbol: string; name: string; market_cap_rank?: number | null;
  image?: { large?: string }; description?: { en?: string; pt?: string };
  links?: { homepage?: string[]; blockchain_site?: string[]; twitter_screen_name?: string };
  categories?: string[]; platforms?: Record<string, string>;
  market_data?: {
    current_price?: { usd?: number }; market_cap?: { usd?: number }; fully_diluted_valuation?: { usd?: number }; total_volume?: { usd?: number };
    circulating_supply?: number; total_supply?: number; max_supply?: number;
    ath?: { usd?: number }; ath_date?: { usd?: string }; atl?: { usd?: number }; atl_date?: { usd?: string };
    price_change_percentage_24h?: number; price_change_percentage_7d?: number; price_change_percentage_30d?: number; price_change_percentage_1y?: number;
  };
}

const COIN_ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** Ficha completa de uma moeda/ativo tokenizado (CoinGecko). */
export function getCoinDetail(id: string) {
  if (!COIN_ID_RE.test(id)) return Promise.resolve({ data: null, fetchedAt: null, stale: false, error: "ativo inválido" } as Cached<CoinDetail>);
  return cached<CoinDetail>(`coingecko:coin:${id}:v1`, 5 * 60, async () => {
    const r = await fetchJson<GeckoDetail>(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, { headers: geckoHeaders() });
    const m = r.market_data ?? {};
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const clean = (t: string) => t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const url = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : null);
    return {
      id: r.id, symbol: r.symbol.toUpperCase(), name: r.name, image: r.image?.large ?? null, rank: n(r.market_cap_rank),
      price: n(m.current_price?.usd), marketCap: n(m.market_cap?.usd), fdv: n(m.fully_diluted_valuation?.usd), volume: n(m.total_volume?.usd),
      circulating: n(m.circulating_supply), total: n(m.total_supply), max: n(m.max_supply),
      ath: n(m.ath?.usd), athDate: m.ath_date?.usd ?? null, atl: n(m.atl?.usd), atlDate: m.atl_date?.usd ?? null,
      change24h: n(m.price_change_percentage_24h), change7d: n(m.price_change_percentage_7d), change30d: n(m.price_change_percentage_30d), change1y: n(m.price_change_percentage_1y),
      description: clean(r.description?.pt || r.description?.en || "").slice(0, 900),
      homepage: url(r.links?.homepage?.find((h) => h)), explorers: (r.links?.blockchain_site ?? []).map(url).filter((u): u is string => !!u).slice(0, 3),
      twitter: r.links?.twitter_screen_name && /^[A-Za-z0-9_]{1,15}$/.test(r.links.twitter_screen_name) ? r.links.twitter_screen_name : null,
      categories: (r.categories ?? []).filter(Boolean).slice(0, 6),
      contracts: Object.entries(r.platforms ?? {}).filter(([k, v]) => k && v).slice(0, 5).map(([platform, address]) => ({ platform, address })),
    };
  });
}

export interface ChartSeries { prices: [number, number][]; caps: [number, number][]; volumes: [number, number][] }

function thin(rows: [number, number][] | undefined, max = 140): [number, number][] {
  const a = (rows ?? []).filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]));
  if (a.length <= max) return a;
  const step = a.length / max;
  return Array.from({ length: max }, (_, i) => a[Math.min(a.length - 1, Math.floor(i * step))]);
}

/** Histórico de preço, valor de mercado e volume (US$) de uma moeda. days: 1 a 365. */
export function getMarketChart(id: string, days: number) {
  const d = [7, 30, 90, 365].includes(days) ? days : 30;
  if (!COIN_ID_RE.test(id)) return Promise.resolve({ data: null, fetchedAt: null, stale: false, error: "ativo inválido" } as Cached<ChartSeries>);
  return cached<ChartSeries>(`coingecko:chart:${id}:${d}:v1`, 15 * 60, async () => {
    const r = await fetchJson<{ prices?: [number, number][]; market_caps?: [number, number][]; total_volumes?: [number, number][] }>(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${d}`, { headers: geckoHeaders() }, 20000);
    const prices = thin(r.prices);
    if (prices.length < 2) throw new Error("sem histórico");
    return { prices, caps: thin(r.market_caps), volumes: thin(r.total_volumes) };
  });
}

/** Cotação simples em BRL (para converter planos em cripto). */
export async function getSpotBrl(coinId: "bitcoin" | "ethereum" | "solana" | "usd-coin" | "tether"): Promise<number> {
  const res = await cached<Record<string, { brl: number }>>("coingecko:spot-brl", 60, async () => {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin,tether&vs_currencies=brl";
    return fetchJson(url, { headers: geckoHeaders() });
  });
  const price = res.data?.[coinId]?.brl;
  if (!price || !Number.isFinite(price)) throw new Error("Cotação indisponível no momento. Tente novamente em instantes.");
  return price;
}

/* ============================ DeFi (DefiLlama) ============================ */

export interface DefiPool {
  id: string;
  chain: string;
  project: string;
  symbol: string;
  /** Faixa de taxa ou detalhe do pool (ex.: "0.3%"), quando o protocolo informa. */
  poolMeta: string | null;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  /** APY médio dos últimos 30 dias. */
  apyMean30d: number | null;
  /** Volume negociado no pool, em US$. Só existe para pools de DEX. */
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  /** Perda impermanente estimada nos últimos 7 dias (%). */
  il7d: number | null;
  ilRisk: boolean;
  stablecoin: boolean;
  /** Endereços dos tokens do pool (só os válidos), usados para abrir a DEX direto no par. */
  tokens: string[];
  /** true quando o pool é de liquidez em DEX (par de ativos), false para empréstimo, staking e outros. */
  dex: boolean;
  /** Origem dos dados. Ausente em registros antigos do cache, que são sempre do DefiLlama. */
  source?: "defillama" | "dexpaprika";
  /** Identificador do pool na própria DEX (Uniswap v4: 32 bytes em hexadecimal). */
  poolRef?: string | null;
}

interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  poolMeta?: string | null;
  exposure?: string | null;
  ilRisk?: string | null;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d?: number | null;
  volumeUsd1d?: number | null;
  volumeUsd7d?: number | null;
  il7d?: number | null;
  underlyingTokens?: string[] | null;
  stablecoin: boolean;
}

const DEX_PROJECT =
  /(uniswap|pancakeswap|sushiswap|aerodrome|velodrome|camelot|curve|balancer|raydium|orca|meteora|thena|trader-?joe|lfj|maverick|ramses|quickswap|shadow|hyperswap|kyber|ambient|fluid-dex|bunni|izumi|dodo|solidly|equalizer|swapbased|alienbase|baseswap|syncswap|nile|cetus|turbos|hercules|mmf|wigoswap)/i;

/** Pool de liquidez em DEX: dois ou mais ativos e protocolo de exchange descentralizada. */
export function isDexPool(project: string, exposure?: string | null): boolean {
  return exposure === "multi" && DEX_PROJECT.test(project);
}

export function toDefiPool(p: LlamaPool): DefiPool {
  const dex = isDexPool(p.project, p.exposure);
  return {
    id: p.pool,
    chain: p.chain,
    project: p.project,
    symbol: p.symbol,
    poolMeta: p.poolMeta ?? null,
    tvlUsd: p.tvlUsd,
    apy: p.apy,
    apyBase: p.apyBase,
    apyReward: p.apyReward,
    apyMean30d: p.apyMean30d ?? null,
    volumeUsd1d: dex ? p.volumeUsd1d ?? null : null,
    volumeUsd7d: dex ? p.volumeUsd7d ?? null : null,
    il7d: p.il7d ?? null,
    ilRisk: p.ilRisk === "yes",
    stablecoin: p.stablecoin,
    tokens: (p.underlyingTokens ?? []).filter((t) => typeof t === "string" && /^0x[0-9a-fA-F]{40}$/.test(t)).slice(0, 4),
    dex,
    source: "defillama",
    poolRef: null,
  };
}

/** Pools do DefiLlama (gratuito). Cache de 30 min; v2 inclui volume, taxa e perda impermanente. */
export function getDefiPools() {
  return cached<DefiPool[]>("defillama:pools:v3", 30 * 60, async () => {
    const raw = await fetchJson<{ data: LlamaPool[] }>("https://yields.llama.fi/pools", {}, 40000);
    return raw.data
      .filter((p) => p.tvlUsd >= 300_000 && p.apy !== null && p.apy !== undefined && p.apy < 1000)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 4000)
      .map(toDefiPool);
  });
}

/* ======================= Robinhood Chain (DexPaprika) =======================
 * O DefiLlama não lista os pools de DEX dessa rede. O DexPaprika (gratuito) lista,
 * mas sem taxa do pool nos pools Uniswap v4 (fee vem nulo). Por isso o APR fica vazio:
 * mostramos liquidez, volume e giro, e não inventamos rendimento. */

interface PaprikaToken { id?: string; symbol?: string; name?: string }
export interface PaprikaPool {
  id?: string;
  dex_id?: string;
  chain?: string;
  volume_usd_24h?: number;
  volume_usd_7d?: number;
  liquidity_usd?: number;
  tokens?: PaprikaToken[];
}

const STABLE_SYMBOLS = new Set(["USDG", "USDC", "USDT", "DAI", "USDS", "PYUSD", "USDE", "FDUSD", "USD1", "RLUSD", "USDTB"]);
const cleanSymbol = (s: unknown) => (typeof s === "string" ? s.replace(/[^\p{L}\p{N}._$-]/gu, "").slice(0, 12) : "") || "?";

/** Converte um pool do DexPaprika no formato da tabela. Devolve null se faltar o essencial. */
export function toPaprikaPool(p: PaprikaPool, chainLabel: string): DefiPool | null {
  const id = typeof p.id === "string" ? p.id : "";
  const liq = Number(p.liquidity_usd);
  if (!id || !Number.isFinite(liq) || liq <= 0 || !Array.isArray(p.tokens) || p.tokens.length < 2) return null;
  const symbols = p.tokens.map((t) => cleanSymbol(t?.symbol));
  const vol = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    id: `dexpaprika:${id}`,
    chain: chainLabel,
    project: String(p.dex_id || "dex").replace(/_/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    symbol: symbols.join("-"),
    poolMeta: null,
    tvlUsd: liq,
    apy: null,
    apyBase: null,
    apyReward: null,
    apyMean30d: null,
    volumeUsd1d: vol(p.volume_usd_24h),
    volumeUsd7d: vol(p.volume_usd_7d),
    il7d: null,
    ilRisk: true,
    stablecoin: symbols.every((x) => STABLE_SYMBOLS.has(x.toUpperCase())),
    tokens: p.tokens.map((t) => t?.id ?? "").filter((t) => /^0x[0-9a-fA-F]{40}$/.test(t)).slice(0, 4),
    dex: true,
    source: "dexpaprika",
    poolRef: /^0x[0-9a-fA-F]{64}$/.test(id) ? id : null,
  };
}

export function getRobinhoodPools() {
  return cached<DefiPool[]>("dexpaprika:robinhood:v1", 30 * 60, async () => {
    const url =
      "https://api.dexpaprika.com/networks/robinhood/pools/search?limit=100&order_by=liquidity_usd&sort=desc&liquidity_usd_min=50000&detailed=true";
    const raw = await fetchJson<{ results?: PaprikaPool[] }>(url, {}, 20000);
    return (raw.results ?? []).map((p) => toPaprikaPool(p, "Robinhood Chain")).filter((p): p is DefiPool => p !== null);
  });
}

/** DefiLlama + redes que só o DexPaprika cobre. Se uma fonte falhar, a outra segue. */
export async function getAllPools(): Promise<Cached<DefiPool[]>> {
  const [llama, hood] = await Promise.all([getDefiPools(), getRobinhoodPools()]);
  const data = llama.data || hood.data ? [...(llama.data ?? []), ...(hood.data ?? [])] : null;
  const times = [llama.fetchedAt, hood.fetchedAt].filter((t): t is number => t !== null);
  return {
    data,
    fetchedAt: times.length ? Math.min(...times) : null,
    stale: llama.stale || hood.stale,
    error: llama.error ?? undefined,
  };
}

/* ===================== Ações e FIIs (brapi.dev, B3) ===================== */

export interface Quote {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  volume: number | null;
  marketCap: number | null;
}

/** Tickers de exemplo por setor (estrutura do Protocolo). Não são recomendações de compra. */
export const STOCK_SECTORS: Record<string, string[]> = {
  Energia: ["TAEE11", "EGIE3", "CPFE3", "ELET3"],
  Bancos: ["ITUB4", "BBDC4", "BBAS3", "SANB11"],
  Saneamento: ["SBSP3", "SAPR11", "CSMG3"],
  Telecom: ["VIVT3", "TIMS3"],
  Seguros: ["BBSE3", "PSSA3", "CXSE3"],
};

export const FII_SEGMENTS: Record<string, string[]> = {
  "Galpões logísticos": ["HGLG11", "XPLG11", "BTLG11", "VILG11"],
  "Shopping centers": ["XPML11", "VISC11", "HSML11"],
  "Outros imóveis de tijolo": ["KNRI11", "PVBI11", "BRCR11"],
  "Fundos de papel": ["KNCR11", "MXRF11", "KNIP11", "CPTS11"],
};

interface BrapiResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

async function fetchBrapi(symbols: string[]): Promise<Record<string, BrapiResult>> {
  const token = process.env.BRAPI_TOKEN;
  const out: Record<string, BrapiResult> = {};
  // Sem token, a brapi limita o plano gratuito; com token buscamos em lotes.
  const batchSize = token ? 10 : 1;
  let lastError = "";
  const get = async (batch: string[]) => {
    const url = `https://brapi.dev/api/quote/${batch.join(",")}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const res = await fetchJson<{ results?: BrapiResult[] }>(url);
    for (const r of res.results || []) out[r.symbol] = r;
  };
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    try {
      await get(batch);
    } catch (e) {
      lastError = e instanceof Error ? e.message : "erro";
      // Alguns planos não aceitam vários ativos por chamada: tenta um a um.
      if (batch.length > 1) {
        for (const s of batch) {
          try { await get([s]); } catch (e2) { lastError = e2 instanceof Error ? e2.message : lastError; }
        }
      }
    }
  }
  if (Object.keys(out).length === 0) {
    throw new Error(token ? `brapi.dev recusou a consulta (${lastError}). Confira o BRAPI_TOKEN.` : "falta o BRAPI_TOKEN (token gratuito da brapi.dev)");
  }
  return out;
}

async function loadGroup(groups: Record<string, string[]>): Promise<Quote[]> {
  const all = Object.values(groups).flat();
  const data = await fetchBrapi(all);
  const quotes: Quote[] = [];
  for (const [sector, symbols] of Object.entries(groups)) {
    for (const s of symbols) {
      const r = data[s];
      quotes.push({
        symbol: s,
        name: r?.shortName || r?.longName || s,
        sector,
        price: r?.regularMarketPrice ?? null,
        changePct: r?.regularMarketChangePercent ?? null,
        volume: r?.regularMarketVolume ?? null,
        marketCap: r?.marketCap ?? null,
      });
    }
  }
  return quotes;
}

/** Segmento de FIIs conhecidos (a brapi não informa segmento de fundos). Fundos fora desta lista caem em "Outros / não classificado". */
const EXTRA_FII_SEGMENTS: Record<string, string[]> = {
  "Galpões logísticos": ["LVBI11", "GGRC11", "HSLG11", "BRCO11", "SDIL11", "TRBL11", "ALMI11", "RBRL11", "CPTR11"],
  "Shopping centers": ["XPML11", "MALL11", "HGBS11", "ABCP11", "FIGS11", "PQDP11", "WPLZ11", "SHPH11"],
  "Outros imóveis de tijolo": ["HGRE11", "JSRE11", "RECT11", "RBRP11", "TRXF11", "HGRU11", "XPCI11", "RZTR11", "PATL11", "VINO11", "TGAR11", "ALZR11", "BTAL11", "HCTR11", "HGPO11"],
  "Fundos de papel": ["KNCR11", "KNIP11", "KNHY11", "KNSC11", "CPTS11", "MXRF11", "RECR11", "RBRR11", "VGIR11", "VGHF11", "HGCR11", "IRDM11", "RZAK11", "BTCI11", "BCRI11", "PORD11", "VCRI11", "CVBI11", "DEVA11", "HABT11", "MCCI11", "URPR11", "XPCI11", "SNCI11", "BARI11"],
  "Fundos de fundos": ["BCFF11", "HFOF11", "KFOF11", "RBRF11", "XPFF11", "MGFF11", "JSAF11", "RFOF11"],
  "Híbridos": ["BTHF11", "GARE11", "KORE11", "VGIP11", "XPSF11"],
};
const FII_SEGMENT_BY_TICKER: Record<string, string> = {};
for (const g of [EXTRA_FII_SEGMENTS, FII_SEGMENTS]) for (const [seg, list] of Object.entries(g)) for (const t of list) FII_SEGMENT_BY_TICKER[t] = seg;

const SECTOR_PT: Record<string, string> = {
  Finance: "Financeiro", Utilities: "Energia, saneamento e utilidades", "Energy Minerals": "Petróleo e energia (minerais)", "Non-Energy Minerals": "Mineração e siderurgia",
  "Retail Trade": "Varejo", Transportation: "Transporte e logística", Communications: "Telecom", "Health Technology": "Saúde (tecnologia)", "Health Services": "Saúde (serviços)",
  "Consumer Non-Durables": "Consumo não durável", "Consumer Durables": "Consumo durável", "Consumer Services": "Serviços ao consumidor", "Process Industries": "Indústria de processos",
  "Technology Services": "Tecnologia (serviços)", "Electronic Technology": "Tecnologia (eletrônicos)", "Producer Manufacturing": "Indústria", "Commercial Services": "Serviços comerciais",
  "Distribution Services": "Distribuição", "Industrial Services": "Serviços industriais", Miscellaneous: "Outros",
};

interface BrapiListItem { stock: string; name?: string; close?: number | null; change?: number | null; volume?: number | null; market_cap?: number | null; sector?: string | null }

async function fetchBrapiList(params: string): Promise<BrapiListItem[]> {
  const token = process.env.BRAPI_TOKEN;
  const url = `https://brapi.dev/api/quote/list?${params}&limit=2000${token ? `&token=${encodeURIComponent(token)}` : ""}`;
  const res = await fetchJson<{ stocks?: BrapiListItem[] }>(url, {}, 25000);
  return res.stocks ?? [];
}

const toQuote = (i: BrapiListItem, sector: string): Quote => ({
  symbol: i.stock, name: i.name || i.stock, sector, price: i.close ?? null, changePct: i.change ?? null, volume: i.volume ?? null, marketCap: i.market_cap ?? null,
});

/** Todas as ações da B3 (lista completa da brapi). Se a lista falhar, cai nos exemplos por setor. */
export const getStocks = () =>
  cached<Quote[]>("brapi:stocks:all:v1", 15 * 60, async () => {
    try {
      const items = (await fetchBrapiList("type=stock")).filter((i) => /^[A-Z]{4}\d{1,2}$/.test(i.stock));
      if (items.length < 20) throw new Error("lista curta");
      return items.map((i) => toQuote(i, SECTOR_PT[i.sector || ""] || i.sector || "Outros"));
    } catch {
      return loadGroup(STOCK_SECTORS);
    }
  });

/** Todos os FIIs da B3, com segmento quando conhecido. Se a lista falhar, cai nos exemplos por segmento. */
export const getFiis = () =>
  cached<Quote[]>("brapi:fiis:all:v1", 15 * 60, async () => {
    try {
      const items = (await fetchBrapiList("type=fund&subType=fii")).filter((i) => /^[A-Z]{4}1[1-3]$/.test(i.stock));
      if (items.length < 20) throw new Error("lista curta");
      return items.map((i) => toQuote(i, FII_SEGMENT_BY_TICKER[i.stock] || "Outros / não classificado"));
    } catch {
      return loadGroup(FII_SEGMENTS);
    }
  });

/* ===================== Página de um ativo ===================== */

export interface AssetDetail {
  symbol: string;
  name: string;
  logo: string | null;
  price: number | null;
  changePct: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  low52: number | null;
  high52: number | null;
  volume: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  dividends: { date: string; value: number; label: string }[];
}

interface BrapiDetail {
  symbol: string; shortName?: string; longName?: string; logourl?: string;
  regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketDayLow?: number; regularMarketDayHigh?: number;
  fiftyTwoWeekLow?: number; fiftyTwoWeekHigh?: number; regularMarketVolume?: number; marketCap?: number; priceEarnings?: number; earningsPerShare?: number;
  dividendsData?: { cashDividends?: { paymentDate?: string; rate?: number; label?: string; relatedTo?: string }[] };
}

export function getAssetDetail(ticker: string) {
  return cached<AssetDetail>(`brapi:detail:${ticker}:v1`, 15 * 60, async () => {
    const token = process.env.BRAPI_TOKEN;
    const url = `https://brapi.dev/api/quote/${ticker}?fundamental=true&dividends=true${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    const r = (await fetchJson<{ results?: BrapiDetail[] }>(url, {}, 20000)).results?.[0];
    if (!r) throw new Error("ativo não encontrado na brapi");
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const divs = (r.dividendsData?.cashDividends ?? [])
      .filter((d) => d.paymentDate && typeof d.rate === "number")
      .sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)))
      .slice(0, 24)
      .map((d) => ({ date: String(d.paymentDate).slice(0, 10), value: d.rate as number, label: d.label || d.relatedTo || "Provento" }));
    return {
      symbol: r.symbol, name: r.longName || r.shortName || r.symbol, logo: r.logourl || null,
      price: num(r.regularMarketPrice), changePct: num(r.regularMarketChangePercent), dayLow: num(r.regularMarketDayLow), dayHigh: num(r.regularMarketDayHigh),
      low52: num(r.fiftyTwoWeekLow), high52: num(r.fiftyTwoWeekHigh), volume: num(r.regularMarketVolume), marketCap: num(r.marketCap),
      pe: num(r.priceEarnings), eps: num(r.earningsPerShare), dividends: divs,
    };
  });
}

/* ===================== Taxas (Banco Central, SGS) ===================== */

export interface Rates {
  selic: number | null; // meta Selic, % a.a.
  cdi: number | null; // CDI anualizado, % a.a.
  ipca12m: number | null; // IPCA acumulado em 12 meses, %
  updatedAt: string | null;
}

async function sgs(code: number): Promise<{ value: number; date: string } | null> {
  const rows = await fetchJson<{ data: string; valor: string }[]>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`,
  );
  const last = rows[0];
  if (!last) return null;
  const value = Number(last.valor.replace(",", "."));
  return Number.isFinite(value) ? { value, date: last.data } : null;
}

export function getRates() {
  return cached<Rates>("bcb:rates", 6 * 60 * 60, async () => {
    const [selic, cdi, ipca] = await Promise.all([sgs(432), sgs(4389), sgs(13522)]);
    if (!selic && !cdi && !ipca) throw new Error("API do Banco Central indisponível");
    return {
      selic: selic?.value ?? null,
      cdi: cdi?.value ?? null,
      ipca12m: ipca?.value ?? null,
      updatedAt: cdi?.date || selic?.date || ipca?.date || null,
    };
  });
}
