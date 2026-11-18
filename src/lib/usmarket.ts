/**
 * Mercado americano: lista curada das maiores ações e REITs (fundos imobiliários dos EUA) com cotação da Yahoo Finance (fonte aberta, em dólar).
 * É uma seleção, não o mercado inteiro; os setores seguem a classificação usual.
 */
import { cachedSwr, fetchJson } from "./market";
import { parseYahoo, type Quote } from "./dividends";
import { db } from "./db";
import { fundKey, getFund, type Fund } from "./sec";

export interface UsAsset { symbol: string; name: string; sector: string }
export type UsKind = "stocks" | "reits";

const L = (sector: string, items: string): UsAsset[] => items.split(";").map((x) => { const [symbol, name] = x.split("|"); return { symbol: symbol.trim(), name: name.trim(), sector }; });

export const US_STOCKS: UsAsset[] = [
  ...L("Tecnologia", "AAPL|Apple;MSFT|Microsoft;NVDA|NVIDIA;AVGO|Broadcom;ORCL|Oracle;CRM|Salesforce;ADBE|Adobe;AMD|AMD;INTC|Intel;CSCO|Cisco;QCOM|Qualcomm;IBM|IBM;TXN|Texas Instruments;NOW|ServiceNow;PLTR|Palantir"),
  ...L("Comunicação", "GOOGL|Alphabet (Google);META|Meta Platforms;NFLX|Netflix;DIS|Walt Disney;T|AT&T;VZ|Verizon;TMUS|T-Mobile US"),
  ...L("Consumo discricionário", "AMZN|Amazon;TSLA|Tesla;HD|Home Depot;NKE|Nike;SBUX|Starbucks;LOW|Lowe's;TGT|Target;BKNG|Booking Holdings;MCD|McDonald's"),
  ...L("Consumo básico", "KO|Coca-Cola;PEP|PepsiCo;PG|Procter & Gamble;WMT|Walmart;COST|Costco;PM|Philip Morris;MO|Altria;CL|Colgate-Palmolive;MDLZ|Mondelez;KHC|Kraft Heinz"),
  ...L("Financeiro", "JPM|JPMorgan Chase;BAC|Bank of America;WFC|Wells Fargo;C|Citigroup;GS|Goldman Sachs;MS|Morgan Stanley;V|Visa;MA|Mastercard;AXP|American Express;BLK|BlackRock;SCHW|Charles Schwab"),
  ...L("Saúde", "JNJ|Johnson & Johnson;UNH|UnitedHealth;LLY|Eli Lilly;PFE|Pfizer;MRK|Merck;ABBV|AbbVie;TMO|Thermo Fisher;ABT|Abbott;BMY|Bristol-Myers Squibb;AMGN|Amgen;GILD|Gilead;CVS|CVS Health"),
  ...L("Energia", "XOM|Exxon Mobil;CVX|Chevron;COP|ConocoPhillips;SLB|Schlumberger;EOG|EOG Resources;OXY|Occidental Petroleum"),
  ...L("Industrial", "CAT|Caterpillar;BA|Boeing;GE|GE Aerospace;HON|Honeywell;UPS|UPS;UNP|Union Pacific;RTX|RTX;LMT|Lockheed Martin;DE|Deere;MMM|3M"),
  ...L("Utilidades (energia e saneamento)", "NEE|NextEra Energy;DUK|Duke Energy;SO|Southern Company;D|Dominion Energy;AEP|American Electric Power"),
  ...L("Materiais", "LIN|Linde;SHW|Sherwin-Williams;FCX|Freeport-McMoRan;NEM|Newmont"),
];

export const US_REITS: UsAsset[] = [
  ...L("Varejo (tijolo)", "O|Realty Income;NNN|NNN REIT;ADC|Agree Realty;REG|Regency Centers;KIM|Kimco Realty;FRT|Federal Realty"),
  ...L("Shopping centers", "SPG|Simon Property Group"),
  ...L("Logística e galpões", "PLD|Prologis;STAG|STAG Industrial;EGP|EastGroup Properties;REXR|Rexford Industrial"),
  ...L("Torres e infraestrutura", "AMT|American Tower;CCI|Crown Castle;SBAC|SBA Communications"),
  ...L("Data centers", "EQIX|Equinix;DLR|Digital Realty;IRM|Iron Mountain"),
  ...L("Self storage", "PSA|Public Storage;EXR|Extra Space Storage;CUBE|CubeSmart"),
  ...L("Residencial", "AVB|AvalonBay;EQR|Equity Residential;MAA|Mid-America Apartment;ESS|Essex Property;CPT|Camden Property;UDR|UDR;INVH|Invitation Homes;AMH|American Homes 4 Rent;SUI|Sun Communities;ELS|Equity LifeStyle"),
  ...L("Saúde", "WELL|Welltower;VTR|Ventas;OHI|Omega Healthcare;HR|Healthcare Realty"),
  ...L("Escritórios", "BXP|BXP (Boston Properties);ARE|Alexandria Real Estate;KRC|Kilroy Realty"),
  ...L("Jogos e lazer", "VICI|VICI Properties;GLPI|Gaming and Leisure Properties;EPR|EPR Properties"),
  ...L("Hotéis", "HST|Host Hotels & Resorts"),
  ...L("Diversificado", "WPC|W. P. Carey;LAMR|Lamar Advertising"),
  ...L("Papel (hipotecário)", "NLY|Annaly Capital;AGNC|AGNC Investment;STWD|Starwood Property Trust"),
];

export const usList = (k: UsKind) => (k === "stocks" ? US_STOCKS : US_REITS);

export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

interface Meta { chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketVolume?: number } }[] } }
export interface UsRow extends UsAsset { price: number | null; changePct: number | null; volume: number | null }

async function lite(sym: string): Promise<{ price: number | null; changePct: number | null; volume: number | null }> {
  const r = await cachedSwr(`yahoo:us:lite:${sym}:v1`, 10 * 60, async () => {
    const m = (await fetchJson<Meta>(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5d&interval=1d`, {}, 15000)).chart?.result?.[0]?.meta;
    if (!m?.regularMarketPrice) throw new Error("sem cotação");
    const prev = m.chartPreviousClose ?? m.previousClose ?? null;
    return { price: m.regularMarketPrice, changePct: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : null, volume: m.regularMarketVolume ?? null };
  });
  return r.data ?? { price: null, changePct: null, volume: null };
}

/** Cotações da lista (em dólar). */
export async function getUsRows(k: UsKind): Promise<UsRow[]> {
  return pool(usList(k), 10, async (a) => ({ ...a, ...(await lite(a.symbol)) }));
}

/** Histórico de 5 anos com proventos (data ex), em dólar. */
export function getUsQuote(sym: string) {
  return cachedSwr<Quote>(`yahoo:us:div:${sym}:v1`, 15 * 60, async () => parseYahoo(await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5y&interval=1d&events=div`, {}, 20000)));
}

/** Lê do cache sem buscar na rede (a lista não pode esperar dezenas de downloads). */
export function peek<T>(key: string): T | null {
  const row = db().prepare("SELECT value FROM cache WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : null;
}
export const peekQuote = (sym: string) => peek<Quote>(`yahoo:us:div:${sym}:v1`);
export const peekFund = (sym: string) => peek<Fund>(fundKey(sym));

const g = globalThis as unknown as { __usWarm?: boolean };
/** Em segundo plano, baixa proventos e balanços que ainda não estão guardados (poucas conexões por vez, respeitando o limite da SEC). */
export function warmUs(syms: string[]): void {
  if (g.__usWarm) return;
  const missing = syms.filter((s) => !peekQuote(s) || !peekFund(s));
  if (!missing.length) return;
  g.__usWarm = true;
  void pool(missing, 3, async (s) => { try { await getUsQuote(s); await getFund(s); } catch { /* segue */ } })
    .finally(() => { g.__usWarm = false; });
}
