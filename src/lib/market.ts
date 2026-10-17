import { db, now } from "./db";

/** Busca JSON com timeout. Lança erro em respostas não-2xx. */
async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
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
    }));
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
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const url = `https://brapi.dev/api/quote/${batch.join(",")}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    try {
      const res = await fetchJson<{ results?: BrapiResult[] }>(url);
      for (const r of res.results || []) out[r.symbol] = r;
    } catch {
      // ignora o lote com falha; os demais seguem
    }
  }
  if (Object.keys(out).length === 0) throw new Error("brapi.dev indisponível ou token inválido");
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

export const getStocks = () => cached<Quote[]>("brapi:stocks", 15 * 60, () => loadGroup(STOCK_SECTORS));
export const getFiis = () => cached<Quote[]>("brapi:fiis", 15 * 60, () => loadGroup(FII_SEGMENTS));

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
