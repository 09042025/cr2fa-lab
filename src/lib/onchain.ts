import { cached, fetchJson, type Cached } from "./market";
import { now } from "./db";
import { alignSeries, parseHolderRows, type DayValue, type RawOnchain } from "./onchain-calc";
import { epochDay } from "./onchain-defs";

/**
 * Dados on-chain do Bitcoin pela API pública (comunitária, sem chave) da Coin Metrics.
 * Cada métrica é pedida separadamente: se uma não existir no plano gratuito, só os indicadores
 * que dependem dela ficam indisponíveis, e o resto continua funcionando.
 */

const BASE = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics";
const METRICS = ["PriceUSD", "SplyCur", "CapRealUSD", "CapMVRVCur", "HashRate", "DiffMean", "AdrActCnt", "TxCnt", "TxTfrValAdjUSD"];
const KEY = "coinmetrics:btc:v1";
const TTL = 6 * 3600;

interface CmPage {
  data?: Record<string, string>[];
  next_page_url?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getPage(url: string): Promise<CmPage> {
  try {
    return await fetchJson<CmPage>(url, {}, 30000);
  } catch (e) {
    // A API gratuita limita a 10 pedidos a cada 6 segundos: espera e tenta de novo uma vez.
    if (e instanceof Error && e.message.includes("429")) {
      await sleep(7000);
      return fetchJson<CmPage>(url, {}, 30000);
    }
    throw e;
  }
}

async function fetchMetric(metric: string): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  let url: string | undefined = `${BASE}?assets=btc&metrics=${metric}&frequency=1d&page_size=10000&paging_from=start&start_time=2009-01-03`;
  for (let page = 0; url && page < 6; page++) {
    const res = await getPage(url);
    for (const row of res.data || []) {
      const v = Number(row[metric]);
      if (row.time && row[metric] !== undefined && row[metric] !== null && Number.isFinite(v)) out.set(epochDay(row.time.slice(0, 10)), v);
    }
    url = res.next_page_url;
  }
  return out;
}

async function load(): Promise<RawOnchain> {
  const maps: Record<string, Map<number, number>> = {};
  const missing: string[] = [];
  const failed: string[] = [];
  for (const m of METRICS) {
    try {
      maps[m] = await fetchMetric(m);
      if (maps[m].size === 0) { delete maps[m]; missing.push(m); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (m === "PriceUSD") throw e;
      if (/HTTP 40[04]/.test(msg)) missing.push(m);
      else failed.push(m);
    }
  }
  const price = maps.PriceUSD;
  if (!price || price.size < 100) throw new Error("Coin Metrics não devolveu o histórico de preço");
  const days = [...price.keys()].sort((a, b) => a - b);
  const start = days[0];
  const n = days[days.length - 1] - start + 1;
  const series: RawOnchain["series"] = {};
  for (const [m, map] of Object.entries(maps)) series[m] = alignSeries(map, start, n);
  return { start, n, series, missing, failed };
}

let inflight: Promise<Cached<RawOnchain>> | null = null;

/** Histórico on-chain em cache de 6 horas. Falhas passageiras de alguma métrica são tentadas de novo depois de 10 minutos. */
export function getBtcOnchain(): Promise<Cached<RawOnchain>> {
  if (inflight) return inflight;
  inflight = (async () => {
    let r = await cached<RawOnchain>(KEY, TTL, load);
    if (r.data && r.data.failed?.length && r.fetchedAt && now() - r.fetchedAt > 600) r = await cached<RawOnchain>(KEY, 0, load);
    return r;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/* ---- Preço realizado de detentores de curto (STH) e longo prazo (LTH): BGeometrics / bitcoin-data.com ---- */

// Plano gratuito: sem chave, últimos 4 anos, 8 pedidos por hora e 15 por dia. Por isso o cache é longo
// e, depois de uma falha, ficamos 30 minutos sem tentar de novo.
const HOLDER_TTL = 12 * 3600;
const HOLDER_COOLDOWN_MS = 30 * 60 * 1000;
const cooldown = new Map<string, number>();

function holderLoader(key: string, path: string): () => Promise<DayValue[]> {
  return async () => {
    if (Date.now() < (cooldown.get(key) ?? 0)) throw new Error("fonte em espera depois de uma falha");
    try {
      const rows = parseHolderRows(await fetchJson<unknown>(`https://bitcoin-data.com/v1/${path}`, {}, 30000));
      if (rows.length < 30) throw new Error("resposta sem dados");
      return rows;
    } catch (e) {
      cooldown.set(key, Date.now() + HOLDER_COOLDOWN_MS);
      throw e;
    }
  };
}

export async function getHolderPrices(): Promise<{ sth: Cached<DayValue[]>; lth: Cached<DayValue[]> }> {
  const [sth, lth] = await Promise.all([
    cached<DayValue[]>("bgeometrics:sth-realized-price:v1", HOLDER_TTL, holderLoader("sth", "sth-realized-price")),
    cached<DayValue[]>("bgeometrics:lth-realized-price:v1", HOLDER_TTL, holderLoader("lth", "lth-realized-price")),
  ]);
  return { sth, lth };
}
