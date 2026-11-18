/**
 * Fundamentos de empresas americanas pela SEC (dados abertos, sem chave): demonstrações em XBRL ("company facts").
 * Resultado em 12 meses móveis (último 10-K + trimestres do 10-Q) e balanço mais recente para patrimônio e dívida.
 */
import { Worker } from "node:worker_threads";
import { cachedSwr, cached, fetchJson } from "./market";

const HEADERS = { "user-agent": process.env.SEC_USER_AGENT || "NIZA INVEST contato@nizainvest.com.br" };

export interface Fund {
  period: string | null;
  revenue: number | null; revenuePrev: number | null;
  netIncome: number | null; netIncomePrev: number | null;
  opIncome: number | null;
  equity: number | null; assets: number | null; liabilities: number | null;
  debt: number | null; cash: number | null; curAssets: number | null; curLiab: number | null;
  ocf: number | null;
  shares: number | null;
  /** Número de imóveis (REITs), quando a empresa informa. */
  properties?: number | null;
}

interface Entry { start?: string; end: string; val: number; form?: string; fp?: string; filed?: string }
type Facts = { facts?: Record<string, Record<string, { units?: Record<string, Entry[]> }>> };

const DAY = 86400000;
const days = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / DAY;

function units(f: Facts, tax: string, concepts: string[], unit = "USD"): Entry[] {
  for (const c of concepts) {
    const u = f.facts?.[tax]?.[c]?.units?.[unit];
    if (u?.length) return u;
  }
  return [];
}

/** Série anual (10-K, ~12 meses) mais recente e a do ano anterior. Entre conceitos alternativos, vale o que tem o dado mais novo. */
function annual(f: Facts, concepts: string[]): { cur: number | null; prev: number | null; end: string | null } {
  let best: Entry[] = [];
  for (const c of concepts) {
    const es = (f.facts?.["us-gaap"]?.[c]?.units?.USD ?? []).filter((e) => /^(10-K|S-1|424B|20-F|40-F)/.test(e.form ?? "") && e.start && days(e.start, e.end) > 340 && days(e.start, e.end) < 390);
    if (es.length && (!best.length || es.reduce((m, e) => (e.end > m ? e.end : m), "") > best.reduce((m, e) => (e.end > m ? e.end : m), ""))) best = es;
  }
  if (!best.length) return { cur: null, prev: null, end: null };
  const cur = best.reduce((a, b) => (b.end > a.end ? b : a));
  const prev = best.find((e) => Math.abs(days(e.end, cur.end) - 365) < 25);
  return { cur: cur.val, prev: prev?.val ?? null, end: cur.end };
}

/**
 * Últimos 12 meses (TTM): último 10-K + acumulado do ano nos 10-Q − o mesmo período do ano anterior. Sem 10-Q mais novo que o 10-K,
 * vale o próprio exercício. `prev` é o TTM de um ano antes (null quando a SEC não traz os comparativos).
 */
function ttm(f: Facts, concepts: string[]): { cur: number | null; prev: number | null; end: string | null } {
  const a = annual(f, concepts);
  if (a.cur === null || a.end === null) return a;
  let all: Entry[] = [];
  for (const c of concepts) {
    const es = (f.facts?.["us-gaap"]?.[c]?.units?.USD ?? []).filter((e) => e.start);
    if (es.length && (!all.length || es.reduce((m, e) => (e.end > m ? e.end : m), "") > all.reduce((m, e) => (e.end > m ? e.end : m), ""))) all = es;
  }
  const q = all.filter((e) => /^10-Q/.test(e.form ?? "") && e.end > a.end! && days(e.start!, e.end) > 60 && days(e.start!, e.end) < 290);
  if (!q.length) return a;
  const lastEnd = q.reduce((m, e) => (e.end > m ? e.end : m), "");
  const y = q.filter((e) => e.end === lastEnd).reduce((m, e) => (days(e.start!, e.end) > days(m.start!, m.end) ? e : m));
  const dur = days(y.start!, y.end);
  const near = (yrs: number) => all.find((e) => /^10-[QK]/.test(e.form ?? "") && Math.abs(days(e.end, y.end) - 365 * yrs) < 20 && Math.abs(days(e.start!, e.end) - dur) < 12);
  const y1 = near(1);
  if (!y1) return a;
  const y2 = near(2);
  return { cur: a.cur + y.val - y1.val, prev: a.prev !== null && y2 ? a.prev + y1.val - y2.val : null, end: y.end };
}

function instant(f: Facts, concepts: string[]): number | null {
  let best: Entry | null = null;
  for (const c of concepts) {
    for (const e of f.facts?.["us-gaap"]?.[c]?.units?.USD ?? []) if (!e.start && (!best || e.end > best.end)) best = e;
  }
  return best ? best.val : null;
}

function propertyCount(f: Facts): number | null {
  for (const c of ["NumberOfRealEstateProperties", "NumberOfPropertiesOwned", "NumberOfRealEstatePropertiesOwned"]) {
    const us = f.facts?.["us-gaap"]?.[c]?.units;
    if (!us) continue;
    let best: Entry | null = null;
    for (const arr of Object.values(us)) for (const e of arr) if (!e.start && (!best || e.end > best.end)) best = e;
    if (best) return best.val;
  }
  return null;
}

export function reduceFacts(f: Facts): Fund {
  const rev = ttm(f, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"]);
  const ni = ttm(f, ["NetIncomeLoss", "ProfitLoss"]);
  const op = ttm(f, ["OperatingIncomeLoss"]);
  const ocf = ttm(f, ["NetCashProvidedByUsedInOperatingActivities"]);
  const equity = instant(f, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]);
  const assets = instant(f, ["Assets"]);
  let liabilities = instant(f, ["Liabilities"]);
  if (liabilities === null && assets !== null && equity !== null) liabilities = assets - equity;
  const shares = units(f, "dei", ["EntityCommonStockSharesOutstanding"], "shares").reduce<Entry | null>((m, e) => (!m || e.end > m.end ? e : m), null)?.val ?? null;
  return {
    period: rev.end ?? ni.end, revenue: rev.cur, revenuePrev: rev.prev, netIncome: ni.cur, netIncomePrev: ni.prev, opIncome: op.cur,
    equity, assets, liabilities, debt: instant(f, ["LongTermDebtNoncurrent", "LongTermDebt"]), cash: instant(f, ["CashAndCashEquivalentsAtCarryingValue"]),
    curAssets: instant(f, ["AssetsCurrent"]), curLiab: instant(f, ["LiabilitiesCurrent"]), ocf: ocf.cur, shares, properties: propertyCount(f),
  };
}

async function cikOf(sym: string): Promise<string | null> {
  const m = await cached<Record<string, string>>("sec:tickers:v1", 7 * 24 * 3600, async () => {
    const j = await fetchJson<Record<string, { cik_str: number; ticker: string }>>("https://www.sec.gov/files/company_tickers.json", { headers: HEADERS }, 30000);
    const out: Record<string, string> = {};
    for (const e of Object.values(j)) out[e.ticker.toUpperCase()] = String(e.cik_str).padStart(10, "0");
    return out;
  });
  return m.data?.[sym] ?? null;
}

/** Conceitos que o código lê do arquivo da SEC: só estes sobram depois da poda (o arquivo bruto tem dezenas de MB). */
export const NEEDED_CONCEPTS = [
  "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet",
  "NetIncomeLoss", "ProfitLoss", "OperatingIncomeLoss", "NetCashProvidedByUsedInOperatingActivities",
  "StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "Assets", "Liabilities",
  "LongTermDebtNoncurrent", "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue", "AssetsCurrent", "LiabilitiesCurrent",
  "NumberOfRealEstateProperties", "NumberOfPropertiesOwned", "NumberOfRealEstatePropertiesOwned", "EntityCommonStockSharesOutstanding",
];

/**
 * Baixa e lê o arquivo da SEC FORA da thread principal: o JSON de empresas grandes tem dezenas de MB e o parse trava o servidor
 * inteiro (todas as telas ficavam lentas enquanto isso). A thread auxiliar devolve só os conceitos usados.
 */
function fetchFactsOffThread(url: string): Promise<Facts> {
  const code = `
    const { parentPort, workerData } = require("node:worker_threads");
    (async () => {
      const res = await fetch(workerData.url, { headers: { "user-agent": workerData.ua, accept: "application/json" }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error("HTTP " + res.status + " em data.sec.gov");
      const j = await res.json();
      const keep = new Set(workerData.need);
      const out = { facts: {} };
      for (const [tax, group] of Object.entries(j.facts || {})) {
        const g = {};
        for (const [name, v] of Object.entries(group)) if (keep.has(name)) g[name] = v;
        if (Object.keys(g).length) out.facts[tax] = g;
      }
      parentPort.postMessage({ ok: true, data: out });
    })().catch((e) => parentPort.postMessage({ ok: false, error: String(e && e.message || e) }));
  `;
  return new Promise((resolve, reject) => {
    const w = new Worker(code, { eval: true, workerData: { url, ua: HEADERS["user-agent"], need: NEEDED_CONCEPTS } });
    w.once("message", (m: { ok: boolean; data?: Facts; error?: string }) => { void w.terminate(); m.ok ? resolve(m.data as Facts) : reject(new Error(m.error)); });
    w.once("error", reject);
  });
}

export const fundKey = (sym: string) => `sec:fund:${sym}:v4`;

export function getFund(sym: string) {
  // 6 h e sem espera: o valor guardado aparece na hora e o balanço novo (após um resultado) entra em segundo plano
  return cachedSwr<Fund>(fundKey(sym), 6 * 3600, async () => {
    const cik = await cikOf(sym);
    if (!cik) throw new Error("empresa não encontrada na SEC");
    return reduceFacts(await fetchFactsOffThread(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`));
  });
}
