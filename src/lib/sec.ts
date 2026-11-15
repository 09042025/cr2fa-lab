/**
 * Fundamentos de empresas americanas pela SEC (dados abertos, sem chave): demonstrações em XBRL ("company facts").
 * Usamos o último exercício anual (10-K) para resultado e o balanço mais recente para patrimônio e dívida.
 */
import { cached, fetchJson } from "./market";

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
    const es = (f.facts?.["us-gaap"]?.[c]?.units?.USD ?? []).filter((e) => e.form === "10-K" && e.start && days(e.start, e.end) > 340 && days(e.start, e.end) < 390);
    if (es.length && (!best.length || es.reduce((m, e) => (e.end > m ? e.end : m), "") > best.reduce((m, e) => (e.end > m ? e.end : m), ""))) best = es;
  }
  if (!best.length) return { cur: null, prev: null, end: null };
  const cur = best.reduce((a, b) => (b.end > a.end ? b : a));
  const prev = best.find((e) => Math.abs(days(e.end, cur.end) - 365) < 25);
  return { cur: cur.val, prev: prev?.val ?? null, end: cur.end };
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
  const rev = annual(f, ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"]);
  const ni = annual(f, ["NetIncomeLoss", "ProfitLoss"]);
  const op = annual(f, ["OperatingIncomeLoss"]);
  const ocf = annual(f, ["NetCashProvidedByUsedInOperatingActivities"]);
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

export const fundKey = (sym: string) => `sec:fund:${sym}:v2`;

export function getFund(sym: string) {
  return cached<Fund>(fundKey(sym), 24 * 3600, async () => {
    const cik = await cikOf(sym);
    if (!cik) throw new Error("empresa não encontrada na SEC");
    return reduceFacts(await fetchJson<Facts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: HEADERS }, 45000));
  });
}
